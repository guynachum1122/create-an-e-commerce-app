'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getDictionary, type AppLocale } from '@/lib/i18n';
import { initPostHog } from '@/lib/posthog';
import { initMixpanel } from '@/lib/mixpanel';
import { CONSENT_KEY } from '@/lib/consent';

export function CookieBanner({ locale }: { locale: string }) {
  const dict = getDictionary(locale as AppLocale);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
  }, []);

  async function save(choice: 'all' | 'essential') {
    const consent = {
      essential: true,
      analytics: choice === 'all',
      marketing: choice === 'all',
      consentedAt: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));

    if (choice === 'all') {
      initPostHog();
      initMixpanel();
    }

    window.dispatchEvent(new CustomEvent('cookie-consent', { detail: consent }));

    await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consent),
    }).catch(() => null);

    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-cookie-banner border-t bg-card p-4 md:p-6 shadow-drawer">
      <div className="mx-auto max-w-content flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <h2 className="font-semibold">{dict['cookie.title']}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {dict['cookie.body']}{' '}
            <Link href={`/${locale}/privacy`} className="text-primary underline">
              {dict['footer.privacy']}
            </Link>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => save('essential')}>
            {dict['cookie.reject']}
          </Button>
          <Button onClick={() => save('all')}>{dict['cookie.accept']}</Button>
        </div>
      </div>
    </div>
  );
}
