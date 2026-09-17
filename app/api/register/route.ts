import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { csrfGuard } from '@/lib/security/csrf';
import { registerSchema } from '@/lib/validations';
import { AccountType } from '@prisma/client';
import { sendWelcomeVerificationEmail } from '@/lib/email/service';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rate = await checkRateLimit('auth:register', ip);
  if (!rate.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid registration data' }, { status: 400 });
  }

  const { name, email, phone, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing?.accountType === AccountType.FULL && !existing.deletedAt) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.verificationToken.deleteMany({
    where: { identifier: { in: [`register:${normalizedEmail}`, `register-data:${normalizedEmail}`] } },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: `register:${normalizedEmail}`,
      token,
      expires,
    },
  });

  const pendingData = JSON.stringify({
    name,
    email: normalizedEmail,
    phone: phone ?? null,
    passwordHash,
  });
  await prisma.verificationToken.create({
    data: {
      identifier: `register-data:${normalizedEmail}`,
      token: pendingData,
      expires,
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  await sendWelcomeVerificationEmail({
    email: normalizedEmail,
    name,
    verifyUrl: `${siteUrl}/en/auth/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`,
  });

  return NextResponse.json({
    requiresVerification: true,
    message: 'Check your email to verify your account before signing in.',
  });
}
