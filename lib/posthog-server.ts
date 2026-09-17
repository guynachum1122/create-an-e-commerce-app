import { PostHog } from 'posthog-node';
import { getServerAnalyticsConsent } from '@/lib/consent';

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    });
  }
  return client;
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  if (!(await getServerAnalyticsConsent())) return;

  const ph = getClient();
  if (!ph) return;
  try {
    ph.capture({ distinctId, event, properties });
    await ph.shutdown();
    client = null;
  } catch {
    /* no-op */
  }
}
