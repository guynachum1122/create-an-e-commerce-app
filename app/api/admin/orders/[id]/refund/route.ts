import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { getPaymentProvider } from '@/lib/payments';
import { csrfGuard } from '@/lib/security/csrf';
import { z } from 'zod';

const refundSchema = z.object({
  amountCents: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    const session = await requireAdmin();
    const { id: orderId } = await params;
    const body = await request.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid refund' }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order?.payment) return NextResponse.json({ error: 'No payment' }, { status: 400 });

    const { amountCents, reason } = parsed.data;
    if (amountCents > order.totalCents - order.payment.refundedCents) {
      return NextResponse.json({ error: 'Amount exceeds refundable total' }, { status: 400 });
    }

    const provider = getPaymentProvider();
    const result = await provider.refund({
      providerPaymentId: order.payment.providerPaymentId ?? order.payment.id,
      amountCents,
    });

    if (!result.success) return NextResponse.json({ error: 'Refund failed' }, { status: 402 });

    const newRefunded = order.payment.refundedCents + amountCents;
    const newStatus = newRefunded >= order.totalCents ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await prisma.$transaction([
      prisma.refund.create({
        data: {
          paymentId: order.payment.id,
          orderId,
          amountCents,
          reason,
          initiatedByUserId: session.user.id,
          providerRefundId: result.providerRefundId,
        },
      }),
      prisma.payment.update({
        where: { id: order.payment.id },
        data: { refundedCents: newRefunded, status: newStatus },
      }),
      prisma.order.update({ where: { id: orderId }, data: { status: newStatus } }),
      prisma.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus: newStatus, note: `Refund of ${amountCents} cents` },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
