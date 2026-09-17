'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trackUserAction, AnalyticsEvents } from '@/lib/analytics';
import { getDictionary, type AppLocale } from '@/lib/i18n';

function SignInForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as AppLocale) ?? 'en';
  const dict = getDictionary(locale);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasGoogle = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === 'true';
  const hasApple = process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === 'true';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);
    if (res.status === 429) {
      setError(dict['auth.rateLimit'] ?? 'Too many login attempts. Try again later.');
      return;
    }
    if (!res.ok) {
      setError(dict['auth.invalidCredentials'] ?? 'Invalid email or password');
      return;
    }

    trackUserAction(AnalyticsEvents.LOGGED_IN, { method: 'email' });
    router.push(searchParams.get('callbackUrl') ?? `/${locale}/account`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-narrow px-gutter py-16">
      <h1 className="font-display text-display-sm text-center">{dict['auth.signIn.title'] ?? 'Sign in'}</h1>

      {(hasGoogle || hasApple) && (
        <div className="mt-6 space-y-2">
          {hasGoogle && (
            <Button type="button" variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl: `/${locale}/account` })}>
              {dict['auth.signIn.google'] ?? 'Continue with Google'}
            </Button>
          )}
          {hasApple && (
            <Button type="button" variant="outline" className="w-full" onClick={() => signIn('apple', { callbackUrl: `/${locale}/account` })}>
              {dict['auth.signIn.apple'] ?? 'Continue with Apple'}
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground">{dict['auth.or'] ?? 'or'}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div><Label htmlFor="email">{dict['auth.email'] ?? 'Email'}</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label htmlFor="password">{dict['auth.password'] ?? 'Password'}</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? (dict['auth.signingIn'] ?? 'Signing in…') : (dict['auth.signIn.title'] ?? 'Sign in')}</Button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${locale}/auth/forgot-password`} className="text-primary underline">{dict['auth.forgotPassword'] ?? 'Forgot password?'}</Link>
        <Link href={`/${locale}/auth/phone`} className="text-primary underline">{dict['auth.signIn.phone'] ?? 'Sign in with phone'}</Link>
        <p>{dict['auth.noAccount'] ?? 'No account?'}{' '}<Link href={`/${locale}/auth/register`} className="text-primary underline">{dict['auth.register.link'] ?? 'Register'}</Link></p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}
