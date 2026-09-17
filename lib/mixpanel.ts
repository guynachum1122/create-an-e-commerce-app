'use client';

import mixpanel from 'mixpanel-browser';

let initialized = false;

export function initMixpanel(): void {
  if (typeof window === 'undefined' || initialized) return;
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) return;
  try {
    mixpanel.init(token, { track_pageview: false });
    initialized = true;
  } catch {
    /* no-op */
  }
}

export function trackMixpanel(event: string, properties?: Record<string, unknown>): void {
  if (!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) return;
  try {
    mixpanel.track(event, properties);
  } catch {
    /* no-op */
  }
}
