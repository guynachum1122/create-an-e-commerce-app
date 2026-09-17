'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';
import { formatPrice, getDictionary, type AppLocale } from '@/lib/i18n';

interface ShippingRate {
  deliveryType: string;
  labelEn: string;
  labelHe: string;
  priceEurCents: number | null;
  priceGbpCents: number | null;
}

interface Pickup {
  id: string;
  nameEn: string;
  nameHe: string;
  city: string;
}

export default function CheckoutShippingPage() {
  const { locale: localeParam } = useParams();
  const locale = (localeParam as AppLocale) ?? 'en';
  const dict = getDictionary(locale);
  const router = useRouter();
  const { checkoutData, setCheckoutData } = useCartStore();
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [deliveryType, setDeliveryType] = useState('STANDARD');
  const [pickupLocationId, setPickupLocationId] = useState('');

  const country = (checkoutData.address as { countryCode?: string })?.countryCode ?? 'NL';
  const region = country === 'GB' ? 'UK' : 'EU';
  const currency = region === 'UK' ? 'GBP' : 'EUR';

  useEffect(() => {
    fetch(`/api/shipping?region=${region}`).then((r) => r.json()).then((d) => {
      setRates(d.rates ?? []);
      setPickups(d.pickups ?? []);
    });
  }, [region]);

  function rateLabel(rate: ShippingRate) {
    return locale === 'he' ? (rate.labelHe ?? rate.labelEn) : rate.labelEn;
  }

  function pickupLabel(p: Pickup) {
    const name = locale === 'he' ? (p.nameHe ?? p.nameEn) : p.nameEn;
    return `${name} — ${p.city}`;
  }

  function continueNext() {
    const selected = rates.find((r) => r.deliveryType === deliveryType);
    const shippingCents = region === 'UK'
      ? (selected?.priceGbpCents ?? 449)
      : (selected?.priceEurCents ?? 499);
    setCheckoutData({
      ...checkoutData,
      deliveryType,
      pickupLocationId: deliveryType === 'PICKUP' ? pickupLocationId : undefined,
      shippingCents,
    });
    router.push(`/${locale}/checkout/payment`);
  }

  return (
    <div>
      <h1 className="font-display text-display-sm">{dict['checkout.shipping.title'] ?? `${dict['checkout.step.shipping']} — ${dict['checkout.title']}`}</h1>
      <div className="mt-6 space-y-3">
        {rates.map((rate) => (
          <label key={rate.deliveryType} className="flex items-center justify-between rounded-md border p-4 cursor-pointer has-[:checked]:border-primary">
            <div className="flex items-center gap-3">
              <input type="radio" name="shipping" checked={deliveryType === rate.deliveryType} onChange={() => setDeliveryType(rate.deliveryType)} />
              <span>{rateLabel(rate)}</span>
            </div>
            <span className="tabular-nums font-medium">{formatPrice(region === 'UK' ? (rate.priceGbpCents ?? 449) : (rate.priceEurCents ?? 499), currency)}</span>
          </label>
        ))}
      </div>
      {deliveryType === 'PICKUP' && (
        <select className="mt-4 w-full h-11 rounded-md border px-3" value={pickupLocationId} onChange={(e) => setPickupLocationId(e.target.value)}>
          <option value="">{dict['checkout.shipping.selectPickup'] ?? 'Select pickup location'}</option>
          {pickups.map((p) => <option key={p.id} value={p.id}>{pickupLabel(p)}</option>)}
        </select>
      )}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" onClick={() => router.back()}>{dict['checkout.back'] ?? 'Back'}</Button>
        <Button className="flex-1" onClick={continueNext}>{dict['checkout.continuePayment'] ?? 'Continue to payment'}</Button>
      </div>
    </div>
  );
}
