import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { noIndexMetadata } from '@/lib/seo/metadata';

export const metadata = noIndexMetadata;

const links = [
  { href: '/admin', label: 'Dashboard', adminOnly: false },
  { href: '/admin/products', label: 'Products', adminOnly: true },
  { href: '/admin/orders', label: 'Orders', adminOnly: false },
  { href: '/admin/returns', label: 'Returns', adminOnly: false },
  { href: '/admin/coupons', label: 'Coupons', adminOnly: true },
  { href: '/admin/shipping', label: 'Shipping', adminOnly: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/en/auth/sign-in');
  if (session.user.role !== 'ADMIN' && session.user.role !== 'WORKER') redirect('/');

  const isAdmin = session.user.role === 'ADMIN';
  const visibleLinks = links.filter((l) => !l.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      <div className="flex">
        <aside className="hidden lg:flex w-64 flex-col border-r bg-white dark:bg-neutral-900 min-h-screen p-4">
          <Link href="/admin" className="text-lg font-bold text-brand-terracotta mb-2">Kitchen-me Admin</Link>
          <span className="text-xs text-muted-foreground mb-6 capitalize">{session.user.role.toLowerCase()}</span>
          <nav className="space-y-1">
            {visibleLinks.map((l) => (
              <Link key={l.href} href={l.href} className="block rounded-md px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href="/" className="mt-auto text-sm text-brand-terracotta hover:underline pt-8">← Back to store</Link>
        </aside>
        <main className="flex-1 p-4 sm:p-8 max-w-screen-2xl">{children}</main>
      </div>
    </div>
  );
}
