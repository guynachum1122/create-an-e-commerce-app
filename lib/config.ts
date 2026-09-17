export const config = {
  appSlug: 'kitchen-me',
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD ?? 5),
  abandonedCartHours: Number(process.env.ABANDONED_CART_HOURS ?? 24),
  searchMinChars: Number(process.env.SEARCH_MIN_CHARS ?? 2),
  searchSuggestionLimit: Number(process.env.SEARCH_SUGGESTION_LIMIT ?? 8),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  storeName: process.env.NEXT_PUBLIC_STORE_NAME ?? 'Kitchen-me',
  storeDescription:
    process.env.NEXT_PUBLIC_STORE_DESCRIPTION ??
    'Bold home and kitchen lifestyle goods for EU & UK.',
  locales: ['en', 'he'] as const,
  defaultLocale: 'en' as const,
  euShippingStandardCents: { eur: 499, gbp: 449 },
  euShippingExpressCents: { eur: 999, gbp: 899 },
  ukShippingStandardCents: { eur: 499, gbp: 449 },
  ukShippingExpressCents: { eur: 999, gbp: 899 },
} as const;

export type Locale = (typeof config.locales)[number];
export type Currency = 'EUR' | 'GBP';
export type Region = 'EU' | 'UK';

/** Validates required env vars at startup — throws in production if missing. */
export function validateProductionConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SITE_URL) missing.push('NEXT_PUBLIC_SITE_URL');
  if (!process.env.AUTH_SECRET) missing.push('AUTH_SECRET');
  if (missing.length > 0) {
    throw new Error(`Missing required production env vars: ${missing.join(', ')}`);
  }
}
