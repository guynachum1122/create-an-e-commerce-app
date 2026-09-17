'use client';

import { useCurrency } from '@/lib/currency/context';
import { getDictionary, type AppLocale } from '@/lib/i18n';
import { useParams } from 'next/navigation';

const REGIONS = [
  { code: 'NL', labelEn: 'EU (€)', labelHe: 'EU (€)' },
  { code: 'GB', labelEn: 'UK (£)', labelHe: 'UK (£)' },
];

export function RegionSelector() {
  const { countryCode, setCountry } = useCurrency();
  const params = useParams();
  const locale = ((params?.locale as string) ?? 'en') as AppLocale;
  const dict = getDictionary(locale);

  return (
    <select
      aria-label={dict['region.label'] ?? 'Shopping region'}
      className="h-9 rounded-md border border-input bg-background px-2 text-xs"
      value={countryCode}
      onChange={(e) => setCountry(e.target.value)}
    >
      {REGIONS.map((r) => (
        <option key={r.code} value={r.code}>
          {locale === 'he' ? r.labelHe : r.labelEn}
        </option>
      ))}
    </select>
  );
}
