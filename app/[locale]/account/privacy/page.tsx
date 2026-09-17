'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getDictionary, type AppLocale } from '@/lib/i18n';

export default function AccountPrivacyPage() {
  const { locale: localeParam } = useParams();
  const locale = (localeParam as AppLocale) ?? 'en';
  const dict = getDictionary(locale);
  const router = useRouter();
  const { data: session } = useSession();
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');

  async function exportData() {
    setExportLoading(true);
    setExportError('');
    try {
      const res = await fetch('/api/account/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) {
        const data = await res.json();
        setExportError(data.error ?? dict['privacy.export.error'] ?? 'Export failed');
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kitchen-me-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(dict['privacy.export.error'] ?? 'Export failed');
    } finally {
      setExportLoading(false);
    }
  }

  async function deleteAccount() {
    if (confirmText !== 'DELETE') return;
    setLoading(true);
    setError('');
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmText: 'DELETE', password: password || undefined }),
    });
    setLoading(false);
    if (res.ok) {
      await signOut({ redirect: false });
      router.push(`/${locale}`);
    } else {
      const data = await res.json();
      setError(data.error ?? dict['privacy.delete.error'] ?? 'Deletion failed');
    }
  }

  return (
    <div className="mx-auto max-w-narrow px-gutter py-8">
      <h1 className="font-display text-display-sm">{dict['account.privacy'] ?? 'Data & privacy'}</h1>

      <section className="mt-8">
        <Link href={`/${locale}/privacy`} className="text-primary underline text-sm">
          {dict['footer.privacy'] ?? 'Privacy policy'}
        </Link>
      </section>

      <section className="mt-12 rounded-lg border p-6">
        <h2 className="font-semibold">{dict['privacy.export.title'] ?? 'Download my data'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {dict['privacy.export.body'] ?? 'Export a copy of your profile, orders, wishlist, and consent history (GDPR data portability).'}
        </p>
        {exportError && <p className="mt-2 text-destructive text-sm">{exportError}</p>}
        <Button className="mt-4" disabled={exportLoading || !session} onClick={exportData}>
          {exportLoading ? (dict['privacy.export.loading'] ?? 'Preparing export…') : (dict['privacy.export.button'] ?? 'Download my data')}
        </Button>
      </section>

      <section className="mt-12 rounded-lg border border-destructive/30 p-6">
        <h2 className="font-semibold text-destructive">{dict['privacy.delete.confirmTitle'] ?? 'Delete your account?'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {dict['privacy.delete.confirmBody'] ?? 'This action is permanent. Your name, email, phone, and saved address will be removed. Anonymised order records may be kept for legal requirements.'}
        </p>
        <p className="mt-4 text-sm">{dict['privacy.delete.typeConfirm'] ?? 'Type DELETE to confirm'}</p>
        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="mt-2 max-w-xs" placeholder="DELETE" />
        {session?.user?.email && (
          <div className="mt-4 max-w-xs">
            <label className="text-sm font-medium">{dict['auth.password'] ?? 'Password'}</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" placeholder={dict['privacy.delete.passwordHint'] ?? 'Required if you have a password'} />
          </div>
        )}
        {error && <p className="mt-2 text-destructive text-sm">{error}</p>}
        <Button variant="destructive" className="mt-4" disabled={confirmText !== 'DELETE' || loading || !session} onClick={deleteAccount}>
          {loading ? (dict['privacy.delete.loading'] ?? 'Deleting…') : (dict['privacy.delete.button'] ?? 'Delete account')}
        </Button>
      </section>
    </div>
  );
}
