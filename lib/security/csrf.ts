import { NextResponse } from 'next/server';

export function validateOrigin(request: Request): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    // Fail closed in production — site URL must be configured
    return process.env.NODE_ENV !== 'production';
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const allowed = new URL(siteUrl).origin;

  if (origin) return origin === allowed;
  if (referer) {
    try {
      return new URL(referer).origin === allowed;
    } catch {
      return false;
    }
  }

  return process.env.NODE_ENV !== 'production';
}

export function csrfGuard(request: Request): NextResponse | null {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return null;
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
