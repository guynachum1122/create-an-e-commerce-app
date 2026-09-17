import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { signIn } from '@/auth';
import { csrfGuard } from '@/lib/security/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { mergeThinAccountsInto } from '@/lib/account/merge';
import { AccountType } from '@prisma/client';
import { z } from 'zod';

const schema = z.object({ phone: z.string().min(5).max(20), code: z.string().length(6) });

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ratePhone = await checkRateLimit('auth:sms-verify', parsed.data.phone);
  const rateIp = await checkRateLimit('auth:sms-verify', ip);
  if (!ratePhone.allowed || !rateIp.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const record = await prisma.smsVerificationCode.findFirst({
    where: { phone: parsed.data.phone, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!record || record.attempts >= 5) {
    return NextResponse.json({ error: 'Code expired or invalid' }, { status: 400 });
  }

  const valid = await bcrypt.compare(parsed.data.code, record.codeHash);
  if (!valid) {
    await prisma.smsVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });

  if (!user) {
    const tempPassword = crypto.randomUUID();
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          phone: parsed.data.phone,
          phoneVerified: new Date(),
          name: 'Phone User',
          accountType: AccountType.FULL,
          passwordHash: await bcrypt.hash(tempPassword, 12),
          email: `${parsed.data.phone.replace(/\D/g, '')}@phone.kitchen-me.local`,
        },
      });
      await mergeThinAccountsInto(tx, created.id, null, parsed.data.phone);
      return created;
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user!.id },
        data: { phoneVerified: new Date(), accountType: AccountType.FULL },
      });
      await mergeThinAccountsInto(tx, user!.id, user!.email, parsed.data.phone);
    });
  }

  await prisma.smsVerificationCode.deleteMany({ where: { phone: parsed.data.phone } });

  const loginToken = crypto.randomBytes(32).toString('hex');
  const identifier = `phone-login:${parsed.data.phone}`;
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: loginToken,
      expires: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  await signIn('phone-otp', {
    phone: parsed.data.phone,
    loginToken,
    redirect: false,
  });

  return NextResponse.json({ ok: true });
}
