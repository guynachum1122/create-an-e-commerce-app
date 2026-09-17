'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDictionary, type AppLocale } from '@/lib/i18n';
import { toast } from 'sonner';

export default function AccountProfilePage() {
  const { locale } = useParams();
  const dict = getDictionary(locale as AppLocale);
  const [form, setForm] = useState({ name: '', email: '', phone: '', preferredLocale: 'EN' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/account/profile').then((r) => r.json()).then((d) => {
      if (d.user) setForm({
        name: d.user.name ?? '',
        email: d.user.email ?? '',
        phone: d.user.phone ?? '',
        preferredLocale: d.user.preferredLocale ?? 'EN',
      });
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/account/profile', {
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
      <h1 className="font-display text-display-sm">{dict['account.profile'] ?? 'Profile'}</h1>
      <form onSubmit={save} className="mt-6 space-y-4">
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div>
          <Label>{dict['account.language'] ?? 'Preferred language'}</Label>
          <select className="w-full h-11 rounded-md border px-3" value={form.preferredLocale} onChange={(e) => setForm({ ...form, preferredLocale: e.target.value })}>
            <option value="EN">English</option>
            <option value="HE">עברית</option>
          </select>
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
      </form>
    </div>
  );
}
