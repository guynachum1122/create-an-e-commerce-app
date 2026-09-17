import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string; orderNumber: string }>;
}) {
  const { locale, orderNumber } = await params;
  return (
    <div className="text-center py-16">
      <CheckCircle className="mx-auto h-16 w-16 text-success" />
      <h1 className="mt-4 font-display text-display-sm">Order confirmed</h1>
      <p className="mt-2 text-muted-foreground">Order #{orderNumber}</p>
      <p className="mt-2 text-sm">A confirmation email has been sent (or logged in dev).</p>
      <div className="mt-8 flex justify-center gap-4">
        <Button asChild variant="outline"><Link href={`/${locale}/account/orders`}>View orders</Link></Button>
        <Button asChild><Link href={`/${locale}`}>Continue shopping</Link></Button>
      </div>
    </div>
  );
}
