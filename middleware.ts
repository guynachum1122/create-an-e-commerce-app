import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['en', 'he'] as const;
const DEFAULT_LOCALE = 'en';

function getLocale(pathname: string): string | null {
  const seg = pathname.split('/')[1];
  return LOCALES.includes(seg as (typeof LOCALES)[number]) ? seg : null;
}

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has('authjs.session-token') ||
    request.cookies.has('__Secure-authjs.session-token')
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = getLocale(pathname);

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (pathname === '/docs') {
    return NextResponse.next();
  }

  // Admin auth is enforced in app/admin/layout.tsx (Node runtime) — no auth imports here.
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (!locale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  if (!LOCALES.includes(locale as (typeof LOCALES)[number])) {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url));
  }

  const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';

  if (pathWithoutLocale.startsWith('/account') && !hasSessionCookie(request)) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, request.url),
    );
  }

  const response = NextResponse.next();
  response.headers.set('x-locale', locale);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
