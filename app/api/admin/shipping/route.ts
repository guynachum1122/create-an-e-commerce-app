import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { adminShippingPatchSchema } from '@/lib/validations';

export async function GET() {
  try {
    await requireAdmin();
    const [rates, pickups] = await Promise.all([
      prisma.shippingRate.findMany({ orderBy: [{ region: 'asc' }, { deliveryType: 'asc' }] }),
      prisma.pickupLocation.findMany({ orderBy: { region: 'asc' } }),
    ]);
    return NextResponse.json({ rates, pickups });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = adminShippingPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid shipping data', details: parsed.error.flatten() }, { status: 400 });
    }

    for (const rate of parsed.data.rates) {
      await prisma.shippingRate.update({
        where: { id: rate.id },
        data: {
          priceEurCents: rate.priceEurCents,
          priceGbpCents: rate.priceGbpCents,
          ...(rate.expressAvailable != null ? { expressAvailable: rate.expressAvailable } : {}),
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
