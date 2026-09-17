import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { adminPickupSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = adminPickupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid pickup data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, ...rest } = parsed.data as typeof parsed.data & { name: string };
    const pickup = await prisma.pickupLocation.create({
      data: { ...rest, nameEn: name, nameHe: name },
    });
    return NextResponse.json({ id: pickup.id });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
