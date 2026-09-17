'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useCartStore } from '@/stores/cart-store';
import { getDictionary, type AppLocale } from '@/lib/i18n';
import { useCurrency } from '@/lib/currency/context';

export default function CheckoutAddressPage() {
  const { locale } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const dict = getDictionary(locale as AppLocale);
  const { setCheckoutData } = useCartStore();
  const { setCountry } = useCurrency();
  const [createFullAccount, setCreateFullAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    firstName: '', lastName: '', line1: '', line2: '', city: '', postalCode: '', countryCode: 'NL',
  });

  async function continueNext(e: React.FormEvent) {
    e.preventDefault();
    setCountry(form.countryCode);
    document.cookie = `kitchen_me_region_country=${form.countryCode};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    await fetch('/api/abandoned-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, phone: form.phone }),
    }).catch(() => {});
    setCheckoutData({
      contact: { name: form.name, email: form.email, phone: form.phone },
      address: {
        firstName: form.firstName, lastName: form.lastName, line1: form.line1, line2: form.line2,
        city: form.city, postalCode: form.postalCode, countryCode: form.countryCode,
      },
      createFullAccount: !session && createFullAccount,
      password: createFullAccount ? password : undefined,
    });
    router.push(`/${locale}/checkout/shipping`);
  }

  return (
    <div>
      <h1 className="font-display text-display-sm">{dict['checkout.step.address'] ?? 'Step 1 — Address'}</h1>
      <form onSubmit={continueNext} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>{dict['checkout.name'] ?? 'Name'}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><Label>{dict['checkout.email'] ?? 'Email'}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div><Label>{dict['checkout.phone'] ?? 'Phone'}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>{dict['checkout.firstName'] ?? 'First name'}</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
          <div><Label>{dict['checkout.lastName'] ?? 'Last name'}</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
        </div>
        <div><Label>{dict['checkout.address'] ?? 'Address'}</Label><Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><Label>{dict['checkout.city'] ?? 'City'}</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div>
          <div><Label>{dict['checkout.postal'] ?? 'Postal code'}</Label><Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required /></div>
          <div><Label>{dict['checkout.country'] ?? 'Country'}</Label>
            <select className="w-full h-11 rounded-md border px-3" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })}>
              <option value="NL">Netherlands (EU)</option>
              <option value="DE">Germany (EU)</option>
              <option value="FR">France (EU)</option>
              <option value="GB">United Kingdom</option>
            </select>
          </div>
        </div>

        {!session && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="fullAccount" checked={createFullAccount} onCheckedChange={(v) => setCreateFullAccount(v === true)} />
              <Label htmlFor="fullAccount">{dict['checkout.createFullAccount'] ?? 'Create a full account (save address, use coupons)'}</Label>
            </div>
            {createFullAccount && (
              <div>
                <Label>{dict['checkout.password'] ?? 'Password'}</Label>
                <Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required={createFullAccount} />
              </div>
            )}
          </div>
        )}

        <Button type="submit" className="w-full">{dict['checkout.continueShipping'] ?? 'Continue to shipping'}</Button>
      </form>
    </div>
  );
}
