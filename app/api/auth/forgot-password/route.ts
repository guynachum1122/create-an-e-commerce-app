import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { forgotPasswordSchema } from '@/lib/validations';
import { sendPasswordResetEmail } from '@/lib/email/service';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }

  const email = parsed.data.email.toLowerCase();
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateEmail = await checkRateLimit('auth:forgot-password', email);
  const rateIp = await checkRateLimit('auth:forgot-password', ip);
  if (!rateEmail.allowed || !rateIp.allowed) {
    return NextResponse.json({ ok: true });
  }
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.passwordHash && !user.deletedAt) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    await sendPasswordResetEmail({
      email,
      name: user.name,
      resetUrl: `${siteUrl}/en/auth/reset-password?token=${token}`,
    });
  }

  return NextResponse.json({ ok: true });
}
