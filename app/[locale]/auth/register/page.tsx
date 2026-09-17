'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDictionary, type AppLocale } from '@/lib/i18n';

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as AppLocale) ?? 'en';
  const dict = getDictionary(locale);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? dict['auth.register.error'] ?? 'Registration failed');
      return;
    }
    if (data.requiresVerification) {
      setSuccess(data.message ?? dict['auth.register.verifyEmail'] ?? 'Check your email to verify your account.');
      return;
    }
    router.push(`/${locale}/account`);
  }

  const fields = [
    { key: 'name' as const, label: dict['checkout.name'] ?? 'Name', type: 'text', required: true },
    { key: 'email' as const, label: dict['auth.email'] ?? 'Email', type: 'email', required: true },
    { key: 'phone' as const, label: dict['checkout.phone'] ?? 'Phone', type: 'text', required: false },
    { key: 'password' as const, label: dict['auth.password'] ?? 'Password', type: 'password', required: true },
  ];

  return (
    <div className="mx-auto max-w-narrow px-gutter py-16">
      <h1 className="font-display text-display-sm text-center">{dict['auth.register.title'] ?? 'Create account'}</h1>
      {success ? (
        <div className="mt-8 rounded-lg border border-success/30 bg-success-muted p-4 text-sm text-center">
          <p>{success}</p>
          <Button asChild className="mt-4"><Link href={`/${locale}/auth/sign-in`}>{dict['nav.signIn'] ?? 'Sign in'}</Link></Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input id={field.key} type={field.type} value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} required={field.required} minLength={field.key === 'password' ? 8 : undefined} />
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? (dict['auth.register.loading'] ?? 'Creating…') : (dict['auth.register.title'] ?? 'Create account')}</Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm"><Link href={`/${locale}/auth/sign-in`} className="text-primary underline">{dict['nav.signIn'] ?? 'Sign in'}</Link></p>
    </div>
  );
}
