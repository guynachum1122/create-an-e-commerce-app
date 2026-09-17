'use client';

import { useEffect } from 'react';

export function LocaleAttributes({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale === 'he' ? 'he' : 'en';
    document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
  }, [locale]);
  return null;
}
