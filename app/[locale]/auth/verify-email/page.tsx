'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getDictionary, type AppLocale } from '@/lib/i18n';

function VerifyEmailForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as AppLocale) ?? 'en';
  const dict = getDictionary(locale);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    if (!token || !email) {
      setStatus('error');
      setMessage(dict['auth.verify.invalid'] ?? 'Invalid verification link.');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success');
          setMessage(dict['auth.verify.success'] ?? 'Your account is verified. You can now sign in.');
        } else {
          const data = await res.json();
          setStatus('error');
          setMessage(data.error ?? dict['auth.verify.invalid'] ?? 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage(dict['auth.verify.invalid'] ?? 'Verification failed.');
      });
  }, [searchParams, dict]);

  return (
    <div className="mx-auto max-w-narrow px-gutter py-16 text-center">
      <h1 className="font-display text-display-sm">
        {dict['auth.verify.title'] ?? 'Verify email'}
      </h1>
      <p className={`mt-4 text-sm ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
        {status === 'loading' ? (dict['auth.verify.loading'] ?? 'Verifying…') : message}
      </p>
      {status === 'success' && (
        <Button className="mt-6" onClick={() => router.push(`/${locale}/auth/sign-in`)}>
          {dict['nav.signIn'] ?? 'Sign in'}
        </Button>
      )}
      {status === 'error' && (
        <Button asChild variant="outline" className="mt-6">
          <Link href={`/${locale}/auth/register`}>{dict['auth.register.link'] ?? 'Register'}</Link>
        </Button>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center">Loading…</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
