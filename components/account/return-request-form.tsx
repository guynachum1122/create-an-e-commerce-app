'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getDictionary, type AppLocale } from '@/lib/i18n';
import { toast } from 'sonner';

interface Props {
  locale: AppLocale;
  orderId: string;
  items: { id: string; name: string }[];
}

export function ReturnRequestForm({ locale, orderId, items }: Props) {
  const dict = getDictionary(locale);
  const [orderItemId, setOrderItemId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setLoading(true);
    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, orderItemId: orderItemId || null, reason }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success('Return request submitted');
      window.location.reload();
    } else {
      toast.error('Could not submit return request');
    }
  }

  return (
    <section className="rounded-lg border p-6">
      <h2 className="font-semibold mb-4">{dict['return.title'] ?? 'Request a return'}</h2>
      {items.length > 1 && (
        <div className="mb-4">
          <Label>{dict['return.item'] ?? 'Item'}</Label>
          <select className="mt-1 w-full h-11 rounded-md border px-3" value={orderItemId} onChange={(e) => setOrderItemId(e.target.value)}>
            <option value="">Whole order</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      )}
      <Label>{dict['return.reason'] ?? 'Reason'}</Label>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="mt-1" />
      <Button className="mt-4" onClick={submit} disabled={loading || !reason.trim()}>Submit return request</Button>
    </section>
  );
}
