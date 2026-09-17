import Link from 'next/link';
import { getDictionary, type AppLocale } from '@/lib/i18n';

export function Footer({ locale }: { locale: string }) {
  const dict = getDictionary(locale as AppLocale);
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-content px-gutter md:px-gutter-lg py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">{dict['footer.shop']}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link href={`/${locale}/category/kitchen`} className="hover:text-primary">Kitchen</Link></li>
              <li><Link href={`/${locale}/category/decor`} className="hover:text-primary">Decor</Link></li>
              <li><Link href={`/${locale}/collections`} className="hover:text-primary">{dict['nav.collections']}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">{dict['nav.account']}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link href={`/${locale}/auth/sign-in`} className="hover:text-primary">{dict['nav.signIn']}</Link></li>
              <li><Link href={`/${locale}/account/orders`} className="hover:text-primary">{dict['nav.orders']}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Kitchen-me</h3>
            <p className="mt-4 text-sm text-muted-foreground">Bold home & kitchen lifestyle goods. EU & UK shipping.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link href={`/${locale}/privacy`} className="hover:text-primary">{dict['footer.privacy']}</Link></li>
              <li><Link href="/docs" className="hover:text-primary">{dict['nav.docs']}</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t pt-8 text-sm text-muted-foreground">© 2026 Kitchen-me. Tax-inclusive prices. Demo payments only.</p>
      </div>
    </footer>
  );
}
