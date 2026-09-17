'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PhoneAuthPage() {
  const { locale } = useParams();
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (res.ok) setStep('code');
    else setError('Could not send code');
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/sms/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? 'Invalid code');
      return;
    }
    const signInRes = await signIn('credentials', {
      email: data.email,
      password: data.tempPassword,
      redirect: false,
    });
    setLoading(false);
    if (signInRes?.error) setError('Sign in failed');
    else router.push(`/${locale}/account`);
  }

  return (
    <div className="mx-auto max-w-narrow px-gutter py-16">
      <h1 className="font-display text-display-sm text-center">Sign in with phone</h1>
      {step === 'phone' ? (
        <form onSubmit={sendCode} className="mt-8 space-y-4">
          <div><Label>Phone (E.164)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31612345678" required /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Sending…' : 'Send code'}</Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-8 space-y-4">
          <div><Label>Verification code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Verifying…' : 'Verify'}</Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm"><Link href={`/${locale}/auth/sign-in`} className="text-primary underline">Back to sign in</Link></p>
    </div>
  );
}
