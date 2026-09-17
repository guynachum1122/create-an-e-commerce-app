import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AccountType } from '@prisma/client';
import { z } from 'zod';
import { csrfGuard } from '@/lib/security/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { mergeThinAccountsInto } from '@/lib/account/merge';

const schema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rate = await checkRateLimit('auth:verify-email', ip);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const { token } = parsed.data;

  const tokenRecord = await prisma.verificationToken.findFirst({
    where: {
      identifier: `register:${email}`,
      token,
      expires: { gt: new Date() },
    },
  });

  if (!tokenRecord) {
    return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
  }

  const dataRecord = await prisma.verificationToken.findFirst({
    where: { identifier: `register-data:${email}`, expires: { gt: new Date() } },
  });

  if (!dataRecord) {
    return NextResponse.json({ error: 'Registration data expired' }, { status: 400 });
  }

  const pending = JSON.parse(dataRecord.token) as {
    name: string;
    email: string;
    phone: string | null;
    passwordHash: string;
  };

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    let created;

    if (existing) {
      created = await tx.user.update({
        where: { id: existing.id },
        data: {
          name: pending.name,
          phone: pending.phone ?? existing.phone,
          passwordHash: pending.passwordHash,
          accountType: AccountType.FULL,
          emailVerified: new Date(),
        },
      });
    } else {
      created = await tx.user.create({
        data: {
          name: pending.name,
          email,
          phone: pending.phone,
          passwordHash: pending.passwordHash,
          accountType: AccountType.FULL,
          emailVerified: new Date(),
        },
      });
    }

    const mergedCount = await mergeThinAccountsInto(tx, created.id, email, pending.phone);

    await tx.verificationToken.deleteMany({
      where: { identifier: { in: [`register:${email}`, `register-data:${email}`] } },
    });

    return { user: created, mergedCount };
  });

  return NextResponse.json({ ok: true, userId: user.user.id, mergedOrders: user.mergedCount });
}
