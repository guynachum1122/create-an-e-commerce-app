'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useParams, usePathname } from 'next/navigation';
import { ShoppingCart, User, Menu, BookOpen, Sun, Moon, Globe } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCartStore } from '@/stores/cart-store';
import { SearchAutocomplete } from '@/components/search/search-autocomplete';
import { useState } from 'react';
import { getDictionary, type AppLocale } from '@/lib/i18n';
import { RegionSelector } from '@/components/layout/region-selector';

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { itemCount, openCart } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const params = useParams();
  const pathname = usePathname();
  const locale = ((params?.locale as string) ?? 'en') as AppLocale;
  const dict = getDictionary(locale);

  const switchLocale = (next: AppLocale) => {
    document.cookie = `kitchen_me_locale=${next};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    const segments = pathname.split('/');
    segments[1] = next;
    return segments.join('/') || `/${next}`;
  };

  return (
    <header className="sticky top-0 z-header w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-header-mobile md:h-header max-w-content items-center gap-3 px-gutter md:px-gutter-lg">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
          <Menu className="h-5 w-5" />
        </Button>

        <Link href={`/${locale}`} className="flex items-center gap-2 shrink-0">
          <img src="/brand/logo.svg" alt="Kitchen-me" className="h-8 w-8 md:h-10 md:w-10" />
          <span className="font-display text-lg font-bold text-foreground">Kitchen-me</span>
        </Link>

        <div className="hidden flex-1 max-w-md lg:block mx-4">
          <SearchAutocomplete />
        </div>

        <div className="ms-auto flex items-center gap-1">
          <div className="hidden sm:block">
            <RegionSelector />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Language">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href={switchLocale('en')}>English</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href={switchLocale('he')}>עברית</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <Link href="/docs" className="hidden sm:flex">
            <Button variant="ghost" size="sm" className="gap-1">
              <BookOpen className="h-4 w-4" />
              <span className="hidden md:inline">{dict['nav.docs']}</span>
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account"><User className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {session ? (
                <>
                  <DropdownMenuItem asChild><Link href={`/${locale}/account`}>{dict['nav.account']}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href={`/${locale}/account/orders`}>{dict['nav.orders']}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href={`/${locale}/account/wishlist`}>{dict['nav.wishlist']}</Link></DropdownMenuItem>
                  {(session.user.role === 'ADMIN' || session.user.role === 'WORKER') && (
                    <DropdownMenuItem asChild><Link href="/admin">{dict['nav.admin'] ?? 'Admin'}</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: `/${locale}` })}>{dict['nav.signOut'] ?? 'Sign out'}</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild><Link href={`/${locale}/auth/sign-in`}>{dict['nav.signIn']}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href={`/${locale}/auth/register`}>{dict['nav.register'] ?? 'Register'}</Link></DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="relative" onClick={openCart} aria-label={dict['nav.cart']}>
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="border-t px-gutter py-2 lg:hidden"><SearchAutocomplete /></div>

      {mobileMenuOpen && (
        <nav className="border-t px-gutter py-3 lg:hidden">
          <div className="flex flex-col gap-2">
            <Link href={`/${locale}/category/kitchen`} className="text-sm py-2" onClick={() => setMobileMenuOpen(false)}>{dict['nav.category.kitchen'] ?? 'Kitchen'}</Link>
            <Link href={`/${locale}/category/decor`} className="text-sm py-2" onClick={() => setMobileMenuOpen(false)}>{dict['nav.category.decor'] ?? 'Decor'}</Link>
            <Link href={`/${locale}/category/storage`} className="text-sm py-2" onClick={() => setMobileMenuOpen(false)}>{dict['nav.category.storage'] ?? 'Storage'}</Link>
            <Link href={`/${locale}/collections`} className="text-sm py-2" onClick={() => setMobileMenuOpen(false)}>{dict['nav.collections']}</Link>
            <Link href="/docs" className="text-sm py-2 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
              <BookOpen className="h-4 w-4" /> {dict['nav.docs']}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
