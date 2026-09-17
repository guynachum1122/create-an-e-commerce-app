'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDictionary, type AppLocale } from '@/lib/i18n';
import { toast } from 'sonner';

export default function AccountAddressPage() {
  const { locale } = useParams();
  const router = useRouter();
  const dict = getDictionary(locale as AppLocale);
  const [form, setForm] = useState({
    firstName: '', lastName: '', line1: '', line2: '', city: '', postalCode: '', countryCode: 'DE', phone: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/account/address').then(async (r) => {
      if (r.status === 403) { router.push(`/${locale}/account`); return; }
      const d = await r.json();
      if (d && d.id) setForm({
        firstName: d.firstName, lastName: d.lastName, line1: d.line1, line2: d.line2 ?? '',
        city: d.city, postalCode: d.postalCode, countryCode: d.countryCode, phone: d.phone,
      });
    });
  }, [locale, router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/account/address', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) toast.success(dict['account.saved'] ?? 'Saved');
    else toast.error('Could not save');
  }

  return (
    <div className="mx-auto max-w-narrow px-gutter py-8">
      <h1 className="font-display text-display-sm">{dict['account.address'] ?? 'Default address'}</h1>
      <form onSubmit={save} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>First name</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
          <div><Label>Last name</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
        </div>
        <div><Label>Address</Label><Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required /></div>
        <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Postal code</Label><Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required /></div>
          <div>
            <Label>Country</Label>
            <select className="w-full h-11 rounded-md border px-3" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })}>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="NL">Netherlands</option>
              <option value="GB">United Kingdom</option>
            </select>
          </div>
        </div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save address'}</Button>
      </form>
    </div>
  );
}
