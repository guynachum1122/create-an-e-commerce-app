import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { adminCouponSchema } from '@/lib/validations';

export async function GET() {
  try {
    await requireAdmin();
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ coupons });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = adminCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid coupon data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { code, type, percentageOff, valueEurCents, valueGbpCents } = parsed.data;
    if (type === 'PERCENTAGE' && percentageOff == null) {
      return NextResponse.json({ error: 'percentageOff required for percentage coupons' }, { status: 400 });
    }
    if (type === 'FIXED_AMOUNT' && (valueEurCents == null || valueGbpCents == null)) {
      return NextResponse.json({ error: 'EUR and GBP values required for fixed amount coupons' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        type,
        percentageOff: type === 'PERCENTAGE' ? percentageOff : null,
        valueEurCents: type === 'FIXED_AMOUNT' ? valueEurCents : null,
        valueGbpCents: type === 'FIXED_AMOUNT' ? valueGbpCents : null,
        isActive: true,
      },
    });
    return NextResponse.json({ id: coupon.id });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
