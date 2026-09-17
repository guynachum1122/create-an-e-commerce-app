'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/stores/cart-store';
import { getDictionary, type AppLocale } from '@/lib/i18n';
import { useCurrency } from '@/lib/currency/context';
import { getConsentHeader } from '@/lib/analytics';
import { Shield, Package, Lock } from 'lucide-react';

interface FakeCard { id: string; labelEn: string; lastFour: string; brand: string }
interface FakeBank { id: string; labelEn: string; bankName: string }
interface SavedMethod { id: string; type: string; label: string; fakeCardId?: string; fakeBankAccountId?: string }

export default function CheckoutPaymentPage() {
  const { locale } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const dict = getDictionary(locale as AppLocale);
  const { currency } = useCurrency();
  const { checkoutData, setCheckoutData, subtotalCents } = useCartStore();
  const [cards, setCards] = useState<FakeCard[]>([]);
  const [banks, setBanks] = useState<FakeBank[]>([]);
  const [savedMethods, setSavedMethods] = useState<SavedMethod[]>([]);
  const [method, setMethod] = useState<'card' | 'bank' | 'saved'>('card');
  const [selectedId, setSelectedId] = useState('');
  const [savedMethodId, setSavedMethodId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [savePayment, setSavePayment] = useState(false);
  const [stockError, setStockError] = useState('');
  const isFullAccount = session?.user?.accountType === 'FULL';

  useEffect(() => {
    fetch('/api/cart/validate-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) setStockError(d.error ?? dict['checkout.stockError'] ?? 'Some items are out of stock.');
      })
      .catch(() => {});
  }, [dict]);

  useEffect(() => {
    fetch('/api/payments/instruments').then((r) => r.json()).then((d) => {
      setCards(d.cards ?? []);
      setBanks(d.banks ?? []);
      if (d.cards?.[0]) setSelectedId(d.cards[0].id);
    });
    if (isFullAccount) {
      fetch('/api/account/saved-payments').then((r) => r.json()).then((d) => {
        setSavedMethods(d.methods ?? []);
      });
    }
  }, [isFullAccount]);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponError('');
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getConsentHeader() },
      body: JSON.stringify({ code: couponCode, subtotalCents, currency }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCouponError(data.error ?? 'Invalid coupon');
      return;
    }
    setCheckoutData({
      ...checkoutData,
      couponCode,
      discountCents: data.discountCents,
    });
  }

  function continueNext() {
    const paymentData: Record<string, unknown> = {
      ...checkoutData,
      couponCode: isFullAccount ? couponCode : undefined,
      savePayment: isFullAccount && savePayment && (method === 'card' || method === 'bank'),
    };

    if (method === 'saved' && savedMethodId) {
      const saved = savedMethods.find((m) => m.id === savedMethodId);
      paymentData.savedPaymentMethodId = savedMethodId;
      paymentData.paymentMethodType = saved?.fakeCardId ? 'SAVED_FAKE_CARD' : 'SAVED_FAKE_BANK';
      paymentData.fakeCardId = saved?.fakeCardId;
      paymentData.fakeBankAccountId = saved?.fakeBankAccountId;
    } else {
      paymentData.paymentMethodType = method === 'card' ? 'FAKE_CARD' : 'FAKE_BANK_TRANSFER';
      paymentData.fakeCardId = method === 'card' ? selectedId : undefined;
      paymentData.fakeBankAccountId = method === 'bank' ? selectedId : undefined;
      paymentData.savedPaymentMethodId = undefined;
    }

    setCheckoutData(paymentData);
    router.push(`/${locale}/checkout/review`);
  }

  return (
    <div>
      <h1 className="font-display text-display-sm">{dict['checkout.step.payment'] ?? 'Step 3 — Payment'}</h1>
      <div className="mt-4 flex flex-wrap gap-4 rounded-lg bg-muted p-4 text-sm">
        <span className="flex items-center gap-1"><Lock className="h-4 w-4" />{dict['checkout.trust.secure']}</span>
        <span className="flex items-center gap-1"><Package className="h-4 w-4" />{dict['checkout.trust.returns']}</span>
        <span className="flex items-center gap-1"><Shield className="h-4 w-4" />{dict['checkout.trust.tax']}</span>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{dict['checkout.payment.demo']}</p>
      {stockError && (
        <p className="mt-4 rounded-md bg-destructive-muted text-destructive text-sm p-3">{stockError}</p>
      )}

      {isFullAccount && savedMethods.length > 0 && (
        <div className="mt-6">
          <Button variant={method === 'saved' ? 'default' : 'outline'} onClick={() => setMethod('saved')}>
            {dict['checkout.savedPayments'] ?? 'Saved methods'}
          </Button>
        </div>
      )}

      {method === 'saved' ? (
        <div className="mt-4 space-y-2">
          {savedMethods.map((item) => (
            <label key={item.id} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer has-[:checked]:border-primary">
              <input type="radio" name="saved" checked={savedMethodId === item.id} onChange={() => setSavedMethodId(item.id)} />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 flex gap-2">
            <Button variant={method === 'card' ? 'default' : 'outline'} onClick={() => { setMethod('card'); setSelectedId(cards[0]?.id ?? ''); }}>
              {dict['checkout.payment.card'] ?? 'Card'}
            </Button>
            <Button variant={method === 'bank' ? 'default' : 'outline'} onClick={() => { setMethod('bank'); setSelectedId(banks[0]?.id ?? ''); }}>
              {dict['checkout.payment.bank'] ?? 'Bank transfer'}
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {(method === 'card' ? cards : banks).map((item) => (
              <label key={item.id} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer has-[:checked]:border-primary">
                <input type="radio" name="payment" checked={selectedId === item.id} onChange={() => setSelectedId(item.id)} />
                <span className="text-sm">{method === 'card' ? (item as FakeCard).labelEn : (item as FakeBank).labelEn}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {isFullAccount ? (
        <>
          <div className="mt-6">
            <label className="text-sm font-medium">{dict['checkout.coupon'] ?? 'Coupon code'}</label>
            <div className="mt-1 flex gap-2">
              <input className="flex-1 h-11 rounded-md border px-3" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="WELCOME10" />
              <Button type="button" variant="outline" onClick={applyCoupon}>{dict['checkout.coupon.apply'] ?? 'Apply'}</Button>
            </div>
            {couponError && <p className="mt-1 text-sm text-destructive">{couponError}</p>}
            {(checkoutData.discountCents as number) > 0 && (
              <p className="mt-1 text-sm text-success">{dict['checkout.coupon.applied'] ?? 'Coupon applied'}</p>
            )}
          </div>
          {(method === 'card' || method === 'bank') && (
            <div className="mt-4 flex items-center gap-2">
              <Checkbox id="savePayment" checked={savePayment} onCheckedChange={(v) => setSavePayment(v === true)} />
              <Label htmlFor="savePayment">{dict['checkout.savePayment'] ?? 'Save this payment method'}</Label>
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{dict['checkout.coupon.guestNote']}</p>
      )}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" onClick={() => router.back()}>{dict['checkout.back'] ?? 'Back'}</Button>
        <Button
          className="flex-1"
          onClick={continueNext}
          disabled={!!stockError || (method === 'saved' ? !savedMethodId : !selectedId)}
        >
          {dict['checkout.continueReview'] ?? 'Continue to review'}
        </Button>
      </div>
    </div>
  );
}
