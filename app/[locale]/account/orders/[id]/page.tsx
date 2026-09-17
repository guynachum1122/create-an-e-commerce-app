import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatPrice, getDictionary, type AppLocale } from '@/lib/i18n';
import { escapeHtml } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReturnRequestForm } from '@/components/account/return-request-form';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/en/auth/sign-in');

  const { locale: localeParam, id } = await params;
  const locale = localeParam as AppLocale;
  const dict = getDictionary(locale);

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: {
      items: true,
      shippingAddress: true,
      statusHistory: { where: { isCustomerVisible: true }, orderBy: { createdAt: 'asc' } },
      returnRequests: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!order) notFound();

  const hasPendingReturn = order.returnRequests.some((r) => r.status === 'PENDING');
  const latestReturn = order.returnRequests[0];

  return (
    <div className="mx-auto max-w-content px-gutter md:px-gutter-lg py-8">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href={`/${locale}/account/orders`}>{dict['account.orders'] ?? 'Orders'}</Link>
        {' / '}
        <span>{escapeHtml(order.orderNumber)}</span>
      </nav>

      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-display-sm">Order #{escapeHtml(order.orderNumber)}</h1>
        <Badge>{order.status}</Badge>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-lg border p-6">
            <h2 className="font-semibold mb-4">{dict['order.items'] ?? 'Items'}</h2>
            <ul className="space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span>{escapeHtml(item.productName)} — {escapeHtml(item.size)} / {escapeHtml(item.color)} × {item.quantity}</span>
                  <span className="tabular-nums">{formatPrice(item.lineTotalCents, order.currency)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border p-6">
            <h2 className="font-semibold mb-4">{dict['order.timeline'] ?? 'Order timeline'}</h2>
            <ol className="space-y-3">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="text-sm border-s-2 border-primary ps-4">
                  <span className="font-medium">{h.toStatus}</span>
                  {h.note && <p className="text-muted-foreground">{escapeHtml(h.note)}</p>}
                  <time className="text-caption text-muted-foreground">{h.createdAt.toLocaleString()}</time>
                </li>
              ))}
            </ol>
          </section>

          {order.returnRequests.length > 0 && (
            <section className="rounded-lg border p-6">
              <h2 className="font-semibold mb-4">{dict['order.returns.title'] ?? 'Return requests'}</h2>
              <ul className="space-y-3">
                {order.returnRequests.map((req) => (
                  <li key={req.id} className="text-sm rounded-md bg-muted p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{dict['order.returns.status'] ?? 'Status'}</span>
                      <Badge variant={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'error' : 'warning'}>
                        {req.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      {req.status === 'PENDING' && (dict['order.returns.pending'] ?? 'Your return request is pending review.')}
                      {req.status === 'APPROVED' && (dict['order.returns.approved'] ?? 'Your return request was approved.')}
                      {req.status === 'REJECTED' && (dict['order.returns.rejected'] ?? 'Your return request was rejected.')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {order.status === 'DELIVERED' && !hasPendingReturn && !latestReturn && (
            <ReturnRequestForm locale={locale} orderId={order.id} items={order.items.map((i) => ({ id: i.id, name: i.productName }))} />
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-6">
            <h2 className="font-semibold mb-4">{dict['order.summary'] ?? 'Summary'}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt>{dict['order.subtotal'] ?? 'Subtotal'}</dt><dd className="tabular-nums">{formatPrice(order.subtotalCents, order.currency)}</dd></div>
              {order.discountCents > 0 && <div className="flex justify-between"><dt>{dict['order.discount'] ?? 'Discount'}</dt><dd className="tabular-nums">-{formatPrice(order.discountCents, order.currency)}</dd></div>}
              <div className="flex justify-between"><dt>{dict['order.shipping'] ?? 'Shipping'}</dt><dd className="tabular-nums">{formatPrice(order.shippingCents, order.currency)}</dd></div>
              <div className="flex justify-between font-semibold border-t pt-2"><dt>{dict['order.total'] ?? 'Total'}</dt><dd className="tabular-nums">{formatPrice(order.totalCents, order.currency)}</dd></div>
            </dl>
          </section>

          {order.shippingAddress && (
            <section className="rounded-lg border p-6 text-sm">
              <h2 className="font-semibold mb-2">{dict['order.shippingAddress'] ?? 'Shipping address'}</h2>
              <p>{escapeHtml(order.shippingAddress.firstName)} {escapeHtml(order.shippingAddress.lastName)}</p>
              <p>{escapeHtml(order.shippingAddress.line1)}</p>
              <p>{escapeHtml(order.shippingAddress.city)}, {escapeHtml(order.shippingAddress.postalCode)}</p>
            </section>
          )}

          {order.trackingNumber && (
            <section className="rounded-lg border p-6">
              <h2 className="font-semibold mb-2">{dict['order.trackingNumber'] ?? 'Tracking number'}</h2>
              <code className="text-sm">{escapeHtml(order.trackingNumber)}</code>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link href={`/${locale}/account/orders/${order.id}/tracking`}>{dict['order.trackShipment'] ?? 'Track shipment'}</Link>
              </Button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
