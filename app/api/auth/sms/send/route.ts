import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { csrfGuard } from '@/lib/security/csrf';
import { z } from 'zod';

const schema = z.object({ phone: z.string().min(5).max(20) });

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ratePhone = await checkRateLimit('auth:sms', parsed.data.phone);
  const rateIp = await checkRateLimit('auth:sms-ip', ip);
  if (!ratePhone.allowed || !rateIp.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const code = String(crypto.randomInt(100000, 999999));
  const codeHash = await bcrypt.hash(code, 10);

  await prisma.smsVerificationCode.create({
    data: {
      phone: parsed.data.phone,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    console.info('[sms:dev]', parsed.data.phone, 'code:', code);
  }

  return NextResponse.json({ ok: true });
}
