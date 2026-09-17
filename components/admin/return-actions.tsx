'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ReturnActions({ returnId }: { returnId: string }) {
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: 'APPROVED' | 'REJECTED') {
    setLoading(true);
    await fetch(`/api/admin/returns/${returnId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    window.location.reload();
  }

  return (
    <div className="mt-4 flex gap-2">
      <Button size="sm" onClick={() => updateStatus('APPROVED')} disabled={loading}>Approve</Button>
      <Button size="sm" variant="destructive" onClick={() => updateStatus('REJECTED')} disabled={loading}>Reject</Button>
    </div>
  );
}
