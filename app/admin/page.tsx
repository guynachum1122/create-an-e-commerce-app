import { prisma } from '@/lib/db';
import { requireStaff } from '@/auth';

export default async function AdminDashboard() {
  await requireStaff();

  const [orderCount, ordersEur, ordersGbp, lowStock, topProducts] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({ where: { currency: 'EUR', status: { notIn: ['CANCELLED'] } }, _sum: { totalCents: true } }),
    prisma.order.aggregate({ where: { currency: 'GBP', status: { notIn: ['CANCELLED'] } }, _sum: { totalCents: true } }),
    prisma.variant.findMany({
      where: { OR: [{ stockQuantity: { lte: 5 } }, { stockQuantity: 0 }] },
      take: 10,
      include: { product: { include: { translations: true } } },
      orderBy: { stockQuantity: 'asc' },
    }),
    prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      _sum: { quantity: true, lineTotalCents: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Kitchen-me Admin</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Orders</p><p className="text-2xl font-bold">{orderCount}</p></div>
        <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Revenue EUR</p><p className="text-2xl font-bold">€{((ordersEur._sum.totalCents ?? 0) / 100).toFixed(2)}</p></div>
        <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Revenue GBP</p><p className="text-2xl font-bold">£{((ordersGbp._sum.totalCents ?? 0) / 100).toFixed(2)}</p></div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-semibold">Top products</h2>
          <ul className="mt-4 space-y-2">
            {topProducts.map((p) => (
              <li key={p.productId} className="text-sm flex justify-between">
                <span>{p.productName}</span>
                <span className="text-muted-foreground">{p._sum.quantity} units · €{((p._sum.lineTotalCents ?? 0) / 100).toFixed(2)}</span>
              </li>
            ))}
            {topProducts.length === 0 && <li className="text-sm text-muted-foreground">No orders yet</li>}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold">Low stock alerts</h2>
          <ul className="mt-4 space-y-2">
            {lowStock.map((v) => (
              <li key={v.id} className={`text-sm ${v.stockQuantity === 0 ? 'text-destructive font-medium' : 'text-warning'}`}>
                {v.sku} — {v.stockQuantity} left ({v.product.translations[0]?.name})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
