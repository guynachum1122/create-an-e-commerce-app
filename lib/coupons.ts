import { prisma } from '@/lib/db';
import type { AccountType, Currency } from '@prisma/client';

export async function validateCoupon(params: {
  code: string;
  userId: string;
  accountType: AccountType;
  subtotalCents: number;
  currency: Currency;
}): Promise<{ valid: boolean; discountCents: number; couponId?: string; error?: string }> {
  const { code, userId, accountType, subtotalCents, currency } = params;

  if (accountType !== 'FULL') {
    return { valid: false, discountCents: 0, error: 'Coupons require a full account' };
  }

  const coupon = await prisma.coupon.findFirst({
    where: {
      code: code.toUpperCase(),
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!coupon) {
    return { valid: false, discountCents: 0, error: 'Invalid coupon code' };
  }

  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, discountCents: 0, error: 'Coupon usage limit reached' };
  }

  const minOrder = currency === 'EUR' ? coupon.minOrderEurCents : coupon.minOrderGbpCents;
  if (minOrder != null && subtotalCents < minOrder) {
    return { valid: false, discountCents: 0, error: 'Order minimum not met for this coupon' };
  }

  const prior = await prisma.couponRedemption.findFirst({
    where: { couponId: coupon.id, userId },
  });
  if (prior) {
    return { valid: false, discountCents: 0, error: 'Coupon already used' };
  }

  let discountCents = 0;
  if (coupon.type === 'PERCENTAGE' && coupon.percentageOff) {
    discountCents = Math.round(subtotalCents * Number(coupon.percentageOff) / 100);
  } else if (coupon.type === 'FIXED_AMOUNT') {
    discountCents = currency === 'EUR' ? (coupon.valueEurCents ?? 0) : (coupon.valueGbpCents ?? 0);
  }

  discountCents = Math.min(discountCents, subtotalCents);

  return { valid: true, discountCents, couponId: coupon.id };
}
