import type { Locale as ConfigLocale } from '@/lib/config';
import en from './dictionaries/en.json';
import he from './dictionaries/he.json';

export type AppLocale = ConfigLocale;
export type Dictionary = typeof en & Record<string, string>;

const dictionaries: Record<AppLocale, Dictionary> = { en, he };

export function getDictionary(locale: AppLocale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export function t(dict: Dictionary, key: keyof Dictionary): string {
  return dict[key] ?? String(key);
}

export function localeToPrisma(locale: AppLocale): 'EN' | 'HE' {
  return locale === 'he' ? 'HE' : 'EN';
}

export function prismaToLocale(locale: 'EN' | 'HE'): AppLocale {
  return locale === 'HE' ? 'he' : 'en';
}

export function formatPrice(cents: number, currency: 'EUR' | 'GBP'): string {
  const amount = (cents / 100).toFixed(2);
  return currency === 'EUR' ? `€${amount}` : `£${amount}`;
}

export function getEffectivePrice(
  variant: {
    priceEurCents: number;
    priceGbpCents: number;
    salePriceEurCents: number | null;
    salePriceGbpCents: number | null;
  },
  currency: 'EUR' | 'GBP',
): { price: number; regular: number; onSale: boolean } {
  if (currency === 'EUR') {
    const regular = variant.priceEurCents;
    const price = variant.salePriceEurCents ?? regular;
    return { price, regular, onSale: variant.salePriceEurCents != null && variant.salePriceEurCents < regular };
  }
  const regular = variant.priceGbpCents;
  const price = variant.salePriceGbpCents ?? regular;
  return { price, regular, onSale: variant.salePriceGbpCents != null && variant.salePriceGbpCents < regular };
}

export function countryToRegion(countryCode: string): 'EU' | 'UK' {
  return countryCode === 'GB' ? 'UK' : 'EU';
}

export function regionToCurrency(region: 'EU' | 'UK'): 'EUR' | 'GBP' {
  return region === 'UK' ? 'GBP' : 'EUR';
}
