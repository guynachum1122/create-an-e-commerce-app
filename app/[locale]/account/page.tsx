import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDictionary, type AppLocale } from '@/lib/i18n';

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await auth();
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  if (!session) redirect(`/${locale}/auth/sign-in`);

  const dict = getDictionary(locale);
  const isFull = session.user.accountType === 'FULL';
  const links = [
    { href: `/${locale}/account/orders`, label: dict['account.orders'] },
    { href: `/${locale}/account/wishlist`, label: dict['nav.wishlist'] },
    { href: `/${locale}/account/profile`, label: dict['account.profile'] ?? 'Profile' },
    ...(isFull ? [
      { href: `/${locale}/account/address`, label: dict['account.address'] ?? 'Address' },
      { href: `/${locale}/account/payments`, label: dict['account.payments'] ?? 'Saved payments' },
    ] : []),
    { href: `/${locale}/account/privacy`, label: dict['account.privacy'] },
  ];

  return (
    <div className="mx-auto max-w-content px-gutter py-8">
      <h1 className="font-display text-display-sm">{dict['nav.account']}</h1>
      <p className="mt-2 text-muted-foreground">
        {dict['account.welcome'] ?? 'Welcome'}, {session.user.name}
        {session.user.accountType === 'THIN' && ` (${dict['account.thin'] ?? 'Guest account'})`}
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg border p-6 hover:bg-accent transition-colors">
            <span className="font-medium">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
