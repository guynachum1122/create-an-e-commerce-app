import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { resetPasswordSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rate = await checkRateLimit('auth:reset-password', `${ip}:${parsed.data.token.slice(0, 8)}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const record = await prisma.verificationToken.findFirst({
    where: { token: parsed.data.token, expires: { gt: new Date() } },
  });

  if (!record) {
    return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user || user.deletedAt) {
    return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
  });
  await prisma.verificationToken.delete({ where: { token: parsed.data.token } });

  return NextResponse.json({ ok: true });
}
