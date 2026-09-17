import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Region } from '@prisma/client';

export async function GET(request: Request) {
  const region = (new URL(request.url).searchParams.get('region') ?? 'EU') as Region;
  const [allRates, pickups] = await Promise.all([
    prisma.shippingRate.findMany({ where: { region, isActive: true } }),
    prisma.pickupLocation.findMany({ where: { region, isActive: true } }),
  ]);

  const rates = allRates.filter((r) => {
    if (r.deliveryType === 'EXPRESS' && !r.expressAvailable) return false;
    return true;
  });

  return NextResponse.json({
    rates: rates.map((r) => ({
      deliveryType: r.deliveryType,
      labelEn: r.labelEn,
      labelHe: r.labelHe,
      priceEurCents: r.priceEurCents,
      priceGbpCents: r.priceGbpCents,
    })),
    pickups: pickups.map((p) => ({
      id: p.id,
      nameEn: p.nameEn,
      nameHe: p.nameHe,
      city: p.city,
    })),
  });
}
