'use client';

import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(): void {
  if (typeof window === 'undefined' || initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview: false,
    loaded: () => {
      initialized = true;
    },
  });
}

export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(event, properties);
  } catch {
    /* no-op */
  }
}

export { posthog };
