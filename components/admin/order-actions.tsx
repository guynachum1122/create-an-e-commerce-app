'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { escapeHtml } from '@/lib/utils';

interface Note {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string };
}

interface Props {
  orderId: string;
  status: string;
  totalCents: number;
  currency: string;
  isAdmin: boolean;
  internalNotes: Note[];
}

export function OrderActions({ orderId, status, totalCents, currency, isAdmin, internalNotes }: Props) {
  const [note, setNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function addNote() {
    if (!note.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${orderId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: note }),
    });
    setLoading(false);
    if (res.ok) window.location.reload();
    else setMessage('Failed to add note');
  }

  async function cancelOrder() {
    if (!confirm('Cancel this order and restock items?')) return;
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${orderId}/cancel`, { method: 'POST' });
    setLoading(false);
    if (res.ok) window.location.reload();
    else setMessage('Cancel failed');
  }

  async function issueRefund() {
    const cents = Math.round(parseFloat(refundAmount) * 100);
    if (!cents || cents <= 0) return;
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: cents }),
    });
    setLoading(false);
    if (res.ok) window.location.reload();
    else setMessage('Refund failed');
  }

  return (
    <div className="space-y-8 mt-8">
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold">Internal notes</h3>
          <span className="text-xs bg-warning-muted text-warning px-2 py-0.5 rounded-full">Internal only</span>
        </div>
        <ul className="space-y-2 mb-4">
          {internalNotes.map((n) => (
            <li key={n.id} className="text-sm border-b pb-2">
              <span className="text-muted-foreground">{escapeHtml(n.author.name)} — {new Date(n.createdAt).toLocaleString()}</span>
              <p className="mt-1">{escapeHtml(n.body)}</p>
            </li>
          ))}
        </ul>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add internal note…" rows={3} />
        <Button className="mt-2" size="sm" onClick={addNote} disabled={loading}>Add note</Button>
      </div>

      {['PROCESSING', 'PENDING'].includes(status) && (
        <Button variant="destructive" onClick={cancelOrder} disabled={loading}>Cancel order</Button>
      )}

      {isAdmin && status !== 'CANCELLED' && status !== 'REFUNDED' && (
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Issue refund</h3>
          <Label>Amount ({currency})</Label>
          <Input type="number" step="0.01" max={(totalCents / 100).toFixed(2)} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="mt-1" />
          <Button className="mt-2" size="sm" onClick={issueRefund} disabled={loading}>Process refund</Button>
        </div>
      )}

      {message && <p className="text-destructive text-sm">{message}</p>}
    </div>
  );
}
