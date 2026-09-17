import { redirect } from 'next/navigation';
export default async function P({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  redirect(`/en/checkout/confirmation/${orderNumber}`);
}
