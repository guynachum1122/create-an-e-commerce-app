import { requireAdmin } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminCouponsClient } from '@/components/admin/admin-coupons-client';

export default async function AdminCouponsPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/admin');
  }
  return <AdminCouponsClient />;
}
