export const CONSENT_KEY = 'kitchen_me_cookie_consent';
export const CONSENT_COOKIE = 'km_consent';

export interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  consentedAt: string;
}

export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentState;
    if (typeof parsed.analytics === 'boolean') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function hasAnalyticsConsent(consentRaw?: string | null): boolean {
  return parseConsent(consentRaw)?.analytics === true;
}

/** Server-side consent from httpOnly km_consent cookie — never trust client headers. */
export async function getServerAnalyticsConsent(): Promise<boolean> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const raw = cookieStore.get(CONSENT_COOKIE)?.value;
  return hasAnalyticsConsent(raw);
}

export function serializeConsent(state: ConsentState): string {
  return JSON.stringify(state);
}
