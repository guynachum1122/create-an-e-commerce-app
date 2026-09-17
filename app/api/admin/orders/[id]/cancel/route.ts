import { NextResponse } from 'next/server';
import { requireStaff } from '@/auth';
import { prisma } from '@/lib/db';
import { restoreStock } from '@/lib/stock';
import { csrfGuard } from '@/lib/security/csrf';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    await requireStaff();
    const { id: orderId } = await params;
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      return NextResponse.json({ error: 'Cannot cancel' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus: 'CANCELLED', note: 'Order cancelled' },
      });
      await restoreStock(order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), tx);
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
