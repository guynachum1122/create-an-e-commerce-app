import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AccountType } from '@prisma/client';
import { validateCoupon } from '@/lib/coupons';
import { checkRateLimit } from '@/lib/rate-limit';
import { csrfGuard } from '@/lib/security/csrf';
import { couponValidateSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const rate = await checkRateLimit('coupons:validate', session.user.id);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json();
  const parsed = couponValidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const result = await validateCoupon({
    code: parsed.data.code,
    userId: session.user.id,
    accountType: (session.user.accountType as AccountType) ?? AccountType.GUEST,
    subtotalCents: parsed.data.subtotalCents,
    currency: parsed.data.currency,
  });

  if (!result.valid) {
    return NextResponse.json({ error: result.error ?? 'Invalid coupon' }, { status: 400 });
  }

  return NextResponse.json({ discountCents: result.discountCents, couponId: result.couponId });
}
