import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/auth';
import { generateTrackingNumber } from '@/lib/utils';
import { sendShippingUpdate } from '@/lib/email/service';
import { restoreStock } from '@/lib/stock';
import { OrderActions } from '@/components/admin/order-actions';
import { escapeHtml } from '@/lib/utils';

const ALLOWED_STATUSES = ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

async function updateStatus(formData: FormData) {
  'use server';
  await requireStaff();
  const orderId = String(formData.get('orderId'));
  const status = String(formData.get('status'));
  if (!ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
    throw new Error('Invalid status');
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customerContact: true, items: true },
  });
  if (!order) return;

  const data: Record<string, unknown> = { status: status as never };
  if (status === 'SHIPPED' && !order.trackingNumber) {
    data.trackingNumber = generateTrackingNumber();
    data.shippedAt = new Date();
  }
  if (status === 'DELIVERED') data.deliveredAt = new Date();

  if (status === 'CANCELLED' && !['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { ...data, cancelledAt: new Date() } });
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus: status as never, note: 'Order cancelled' },
      });
      await restoreStock(order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), tx);
    });
    return;
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data }),
    prisma.orderStatusHistory.create({
      data: { orderId, fromStatus: order.status, toStatus: status as never, note: `Status updated to ${status}` },
    }),
  ]);

  if (status === 'SHIPPED' && order.customerContact) {
    await sendShippingUpdate({
      email: order.customerContact.email,
      name: order.customerContact.name,
      orderNumber: order.orderNumber,
      trackingNumber: (data.trackingNumber as string) ?? order.trackingNumber ?? '',
    });
  }
}

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      customerContact: true,
      shippingAddress: true,
      payment: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      internalNotes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!order) notFound();

  const isAdmin = session.user.role === 'ADMIN';

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold">Order {escapeHtml(order.orderNumber)}</h1>
      <p className="text-muted-foreground">
        {order.status}
        {order.trackingNumber && ` · Tracking: ${escapeHtml(order.trackingNumber)}`}
      </p>

      {order.customerContact && (
        <div className="mt-4 text-sm">
          <p>{escapeHtml(order.customerContact.name)} — {escapeHtml(order.customerContact.email)}</p>
        </div>
      )}

      <ul className="mt-6 space-y-2">
        {order.items.map((i) => (
          <li key={i.id} className="text-sm flex justify-between">
            <span>{escapeHtml(i.productName)} × {i.quantity}</span>
            <span className="tabular-nums">{(i.lineTotalCents / 100).toFixed(2)} {order.currency}</span>
          </li>
        ))}
      </ul>

      <form action={updateStatus} className="mt-8 flex gap-2">
        <input type="hidden" name="orderId" value={order.id} />
        <select name="status" defaultValue={order.status} className="h-11 rounded-md border px-3">
          {ALLOWED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="h-11 px-4 rounded-md bg-primary text-primary-foreground">Update status</button>
      </form>

      <OrderActions
        orderId={order.id}
        status={order.status}
        totalCents={order.totalCents}
        currency={order.currency}
        isAdmin={isAdmin}
        internalNotes={order.internalNotes.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
