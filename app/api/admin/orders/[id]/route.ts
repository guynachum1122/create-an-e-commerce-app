import { NextResponse } from 'next/server';
import { requireStaff } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true, payment: true } });
    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
