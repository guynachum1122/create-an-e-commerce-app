import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { addressSchema } from '@/lib/validations';
import { countryToRegion } from '@/lib/i18n';
import { AccountType } from '@prisma/client';
import { z } from 'zod';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.accountType !== AccountType.FULL) {
    return NextResponse.json({ error: 'Full account required' }, { status: 403 });
  }
  const address = await prisma.address.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(address);
}

export async function PATCH(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.accountType !== AccountType.FULL) {
    return NextResponse.json({ error: 'Full account required' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = addressSchema.extend({ phone: z.string().min(5).max(20) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid address' }, { status: 400 });

  const data = parsed.data;
  const address = await prisma.address.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      firstName: data.firstName,
      lastName: data.lastName,
      line1: data.line1,
      line2: data.line2,
      city: data.city,
      stateProvince: data.stateProvince,
      postalCode: data.postalCode,
      countryCode: data.countryCode,
      phone: data.phone,
      region: countryToRegion(data.countryCode),
    },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      line1: data.line1,
      line2: data.line2,
      city: data.city,
      stateProvince: data.stateProvince,
      postalCode: data.postalCode,
      countryCode: data.countryCode,
      phone: data.phone,
      region: countryToRegion(data.countryCode),
    },
  });

  return NextResponse.json(address);
}
