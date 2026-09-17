import Link from 'next/link';
import { CurrencyProvider } from '@/lib/currency/context';

export default async function CheckoutLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-background py-4">
          <div className="mx-auto max-w-narrow px-gutter flex justify-center">
            <Link href={`/${locale}`} className="font-display text-lg font-bold flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.svg" alt="" className="h-8 w-8" />
              Kitchen-me
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-narrow px-gutter py-8">{children}</div>
      </div>
    </CurrencyProvider>
  );
}
