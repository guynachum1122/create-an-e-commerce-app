import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signIn } from '@/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { csrfGuard } from '@/lib/security/csrf';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const rateEmail = await checkRateLimit('auth:login', email);
  const rateIp = await checkRateLimit('auth:login-ip', ip);
  if (!rateEmail.allowed || !rateIp.allowed) {
    return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || user.deletedAt) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  await signIn('credentials', { email, password: parsed.data.password, redirect: false });

  return NextResponse.json({ ok: true });
}
