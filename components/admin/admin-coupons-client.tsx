'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Coupon {
  id: string;
  code: string;
  type: string;
  percentageOff: number | null;
  valueEurCents: number | null;
  valueGbpCents: number | null;
  usageCount: number;
  usageLimit: number | null;
  isActive: boolean;
}

export function AdminCouponsClient() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState({ code: '', type: 'PERCENTAGE', percentageOff: '10', valueEurCents: '1500', valueGbpCents: '1200' });
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/coupons');
    const data = await res.json();
    setCoupons(data.coupons ?? []);
  }

  useEffect(() => { load(); }, []);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code,
        type: form.type,
        percentageOff: form.type === 'PERCENTAGE' ? Number(form.percentageOff) : undefined,
        valueEurCents: form.type === 'FIXED_AMOUNT' ? Number(form.valueEurCents) : undefined,
        valueGbpCents: form.type === 'FIXED_AMOUNT' ? Number(form.valueGbpCents) : undefined,
      }),
    });
    setLoading(false);
    setForm({ code: '', type: 'PERCENTAGE', percentageOff: '10', valueEurCents: '1500', valueGbpCents: '1200' });
    load();
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold">Coupons</h1>
      <p className="text-sm text-muted-foreground mt-1">Full account customers only at checkout.</p>

      <form onSubmit={createCoupon} className="mt-8 space-y-4 border rounded-lg p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></div>
          <div>
            <Label>Type</Label>
            <select className="w-full h-11 rounded-md border px-3" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed amount</option>
            </select>
          </div>
          {form.type === 'PERCENTAGE' ? (
            <div><Label>Percent off</Label><Input value={form.percentageOff} onChange={(e) => setForm({ ...form, percentageOff: e.target.value })} /></div>
          ) : (
            <>
              <div><Label>EUR cents off</Label><Input value={form.valueEurCents} onChange={(e) => setForm({ ...form, valueEurCents: e.target.value })} /></div>
              <div><Label>GBP cents off</Label><Input value={form.valueGbpCents} onChange={(e) => setForm({ ...form, valueGbpCents: e.target.value })} /></div>
            </>
          )}
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Create coupon'}</Button>
      </form>

      <table className="mt-8 w-full text-sm">
        <thead><tr className="border-b"><th className="py-2 text-start">Code</th><th>Type</th><th>Usage</th><th>Active</th></tr></thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="py-2 font-mono">{c.code}</td>
              <td>{c.type}</td>
              <td>{c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
              <td>{c.isActive ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
