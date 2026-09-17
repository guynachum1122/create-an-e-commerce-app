'use client';

import { captureEvent } from '@/lib/posthog';
import { trackMixpanel } from '@/lib/mixpanel';
import { CONSENT_KEY, parseConsent } from '@/lib/consent';

export function getConsentHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(CONSENT_KEY);
  return raw ? { 'x-consent': raw } : {};
}

export function trackUserAction(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const consent = parseConsent(localStorage.getItem(CONSENT_KEY));
  if (!consent?.analytics) return;
  captureEvent(event, properties);
  trackMixpanel(event, properties);
}

export const AnalyticsEvents = {
  SIGNED_UP: 'signed_up',
  LOGGED_IN: 'logged_in',
  PURCHASE_COMPLETED: 'purchase_completed',
  FEATURE_USED: 'feature_used',
  ADD_TO_CART: 'add_to_cart',
  CHECKOUT_STARTED: 'checkout_started',
} as const;
