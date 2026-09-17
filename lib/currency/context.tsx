'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { countryToRegion, regionToCurrency } from '@/lib/i18n';

type Currency = 'EUR' | 'GBP';

const CurrencyContext = createContext<{
  currency: Currency;
  countryCode: string;
  setCountry: (code: string) => void;
}>({
  currency: 'EUR',
  countryCode: 'NL',
  setCountry: () => {},
});

const STORAGE_KEY = 'kitchen_me_region_country';
const DEFAULT_COUNTRY = 'NL';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY);
  const [currency, setCurrency] = useState<Currency>('EUR');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCountryCode(stored);
      setCurrency(regionToCurrency(countryToRegion(stored)));
      document.cookie = `${STORAGE_KEY}=${stored};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    }
  }, []);

  function setCountry(code: string) {
    localStorage.setItem(STORAGE_KEY, code);
    document.cookie = `${STORAGE_KEY}=${code};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    setCountryCode(code);
    setCurrency(regionToCurrency(countryToRegion(code)));
  }

  return (
    <CurrencyContext.Provider value={{ currency, countryCode, setCountry }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
