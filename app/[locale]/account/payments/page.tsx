'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getDictionary, type AppLocale } from '@/lib/i18n';

interface SavedMethod {
  id: string;
  label: string;
  type: string;
}

export default function AccountPaymentsPage() {
  const { locale } = useParams();
  const dict = getDictionary(locale as AppLocale);
  const [methods, setMethods] = useState<SavedMethod[]>([]);

  useEffect(() => {
    fetch('/api/account/saved-payments').then((r) => r.json()).then((d) => setMethods(d.methods ?? []));
  }, []);

  return (
    <div className="mx-auto max-w-narrow px-gutter py-8">
      <h1 className="font-display text-display-sm">{dict['account.payments'] ?? 'Saved payment methods'}</h1>
      {methods.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{dict['account.payments.empty'] ?? 'No saved methods. Save one at checkout on your next order.'}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {methods.map((m) => (
            <li key={m.id} className="rounded-lg border p-4 text-sm">{m.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
