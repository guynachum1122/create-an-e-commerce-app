'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { initPostHog } from '@/lib/posthog';
import { initMixpanel } from '@/lib/mixpanel';
import { CONSENT_KEY, parseConsent } from '@/lib/consent';
import { AnalyticsGate } from '@/components/layout/analytics-gate';
import { CurrencyProvider } from '@/lib/currency/context';

function initAnalyticsIfConsented() {
  const consent = parseConsent(localStorage.getItem(CONSENT_KEY));
  if (consent?.analytics) {
    initPostHog();
    initMixpanel();
  }
}

export function Providers({ children }: { children: React.ReactNode; locale?: string }) {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    initAnalyticsIfConsented();
    setAnalyticsAllowed(parseConsent(localStorage.getItem(CONSENT_KEY))?.analytics === true);

    function onConsent(e: Event) {
      const detail = (e as CustomEvent<{ analytics: boolean }>).detail;
      if (detail.analytics) {
        initPostHog();
        initMixpanel();
      }
      setAnalyticsAllowed(detail.analytics);
    }

    window.addEventListener('cookie-consent', onConsent);
    return () => window.removeEventListener('cookie-consent', onConsent);
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <CurrencyProvider>
          {children}
          <Toaster position="bottom-center" richColors />
          {analyticsAllowed && <AnalyticsGate />}
        </CurrencyProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
