'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/account', label: 'Dashboard' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/settings', label: 'Settings' },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden md:block w-48 shrink-0 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'block rounded-md px-3 py-2 text-sm',
              pathname === link.href
                ? 'bg-accent text-accent-foreground border-l-2 border-brand-600 font-medium'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="md:hidden mb-6 flex gap-2 overflow-x-auto pb-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-sm border',
              pathname === link.href ? 'bg-brand-600 text-white border-brand-600' : 'border-neutral-200'
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </>
  );
}
