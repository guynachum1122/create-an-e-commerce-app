import { requireAdmin } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminShippingClient } from '@/components/admin/admin-shipping-client';

export default async function AdminShippingPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/admin');
  }
  return <AdminShippingClient />;
}
