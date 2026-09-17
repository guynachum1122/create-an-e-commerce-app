import { Providers } from '@/components/providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { CookieBanner } from '@/components/layout/cookie-banner';
import { CartHydrator } from '@/components/cart/cart-hydrator';
import { LocaleAttributes } from '@/components/locale-attributes';
import { config } from '@/lib/config';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return config.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!config.locales.includes(locale as (typeof config.locales)[number])) notFound();

  return (
    <>
      <LocaleAttributes locale={locale} />
      <Providers locale={locale}>
        <CartHydrator />
        <Header />
        <main className="min-h-[calc(100vh-8rem)]">{children}</main>
        <Footer locale={locale} />
        <CartDrawer locale={locale} />
        <CookieBanner locale={locale} />
      </Providers>
    </>
  );
}
