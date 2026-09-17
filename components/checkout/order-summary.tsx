'use client';

import { useCartStore } from '@/stores/cart-store';
import { formatPrice } from '@/lib/i18n';

interface OrderSummaryProps {
  shippingCents?: number;
  showShipping?: boolean;
}

export function OrderSummary({ shippingCents = 0, showShipping = false }: OrderSummaryProps) {
  const { items, subtotalCents } = useCartStore();
  const totalCents = subtotalCents + (showShipping ? shippingCents : 0);

  return (
    <div className="rounded-lg border p-4 space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex justify-between text-sm">
          <span>{item.productName} × {item.quantity}</span>
          <span className="tabular-nums">{formatPrice(item.lineTotalCents, 'EUR')}</span>
        </div>
      ))}
      <div className="border-t pt-2 flex justify-between font-semibold">
        <span>Total (tax included)</span>
        <span className="tabular-nums">{formatPrice(totalCents, 'EUR')}</span>
      </div>
    </div>
  );
}
