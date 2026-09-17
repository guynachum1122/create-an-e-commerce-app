'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';
import { formatPrice, countryToRegion, regionToCurrency, getDictionary, type AppLocale } from '@/lib/i18n';
import { useCurrency } from '@/lib/currency/context';
import { trackUserAction, AnalyticsEvents, getConsentHeader } from '@/lib/analytics';

export default function CheckoutReviewPage() {
  const { locale } = useParams();
  const router = useRouter();
  const { currency } = useCurrency();
  const dict = getDictionary(locale as AppLocale);
  const { items, subtotalCents, checkoutData, resetCheckout, setCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const address = checkoutData.address as { countryCode?: string } | undefined;
  const resolvedCurrency = address?.countryCode
    ? regionToCurrency(countryToRegion(address.countryCode))
    : currency;
  const shippingCents = (checkoutData.shippingCents as number) ?? 0;
  const discountCents = (checkoutData.discountCents as number) ?? 0;
  const totalCents = subtotalCents - discountCents + shippingCents;

  async function placeOrder() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getConsentHeader() },
      body: JSON.stringify({ ...checkoutData, locale: locale === 'he' ? 'HE' : 'EN' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? 'Order failed');
      return;
    }

    trackUserAction(AnalyticsEvents.PURCHASE_COMPLETED, { orderNumber: data.orderNumber });
    resetCheckout();
    setCart({ items: [], itemCount: 0, subtotalCents: 0 });
    setLoading(false);
    router.push(`/${locale}/checkout/confirmation/${data.orderNumber}?signedIn=${data.signedIn ? '1' : '0'}`);
  }

  return (
    <div>
      <h1 className="font-display text-display-sm">{dict['checkout.step.review'] ?? 'Step 4 — Review'}</h1>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between text-sm">
            <span>{item.productName} × {item.quantity}</span>
            <span className="tabular-nums">{formatPrice(item.lineTotalCents, resolvedCurrency)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 text-sm border-t pt-4">
        <div className="flex justify-between"><dt>{dict['checkout.subtotal'] ?? 'Subtotal'}</dt><dd className="tabular-nums">{formatPrice(subtotalCents, resolvedCurrency)}</dd></div>
        {discountCents > 0 && (
          <div className="flex justify-between text-success">
            <dt>{dict['checkout.discount'] ?? 'Discount'}</dt>
            <dd className="tabular-nums">-{formatPrice(discountCents, resolvedCurrency)}</dd>
          </div>
        )}
        <div className="flex justify-between"><dt>{dict['checkout.shipping'] ?? 'Shipping'}</dt><dd className="tabular-nums">{formatPrice(shippingCents, resolvedCurrency)}</dd></div>
        <div className="flex justify-between font-semibold text-base border-t pt-2">
          <dt>{dict['checkout.total'] ?? 'Total (tax included)'}</dt>
          <dd className="tabular-nums">{formatPrice(totalCents, resolvedCurrency)}</dd>
        </div>
      </dl>
      {error && <p className="mt-4 text-destructive text-sm">{error}</p>}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" onClick={() => router.back()}>{dict['checkout.back'] ?? 'Back'}</Button>
        <Button className="flex-1" onClick={placeOrder} disabled={loading}>
          {loading ? (dict['loading.checkout'] ?? 'Processing…') : (dict['checkout.placeOrder'] ?? 'Place order')}
        </Button>
      </div>
    </div>
  );
}
