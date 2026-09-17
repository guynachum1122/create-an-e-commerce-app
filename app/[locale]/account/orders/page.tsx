import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatPrice, getDictionary, type AppLocale } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';

const deliveryLabels: Record<string, { en: string; he: string }> = {
  STANDARD: { en: 'Standard', he: 'רגיל' },
  EXPRESS: { en: 'Express', he: 'מהיר' },
  PICKUP: { en: 'Pickup', he: 'איסוף' },
};

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await auth();
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  const dict = getDictionary(locale);
  if (!session) redirect(`/${locale}/auth/sign-in`);

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  function deliveryLabel(type: string) {
    const labels = deliveryLabels[type];
    if (!labels) return type;
    return locale === 'he' ? labels.he : labels.en;
  }

  return (
    <div className="mx-auto max-w-content px-gutter py-8">
      <h1 className="font-display text-display-sm">{dict['account.orders'] ?? 'Order history'}</h1>
      {orders.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{dict['account.orders.empty'] ?? 'No orders yet.'}</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-lg border p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <Link href={`/${locale}/account/orders/${order.id}`} className="font-medium hover:text-primary">#{order.orderNumber}</Link>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-GB')} · {order.status} · {deliveryLabel(order.deliveryType)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{deliveryLabel(order.deliveryType)}</Badge>
                <span className="font-semibold tabular-nums">{formatPrice(order.totalCents, order.currency)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
