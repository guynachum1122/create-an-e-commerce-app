import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/auth';
import { formatPrice } from '@/lib/i18n';

export default async function AdminOrdersPage() {
  await requireStaff();
  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { customerContact: true } });
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Orders</h1>
      <table className="mt-6 w-full text-sm">
        <thead><tr className="border-b text-start"><th className="py-2">Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b">
              <td className="py-2"><Link href={`/admin/orders/${o.id}`} className="text-primary hover:underline">{o.orderNumber}</Link></td>
              <td>{o.customerContact?.email ?? '—'}</td>
              <td>{o.status}</td>
              <td className="tabular-nums">{formatPrice(o.totalCents, o.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
