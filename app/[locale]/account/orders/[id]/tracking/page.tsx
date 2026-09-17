import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { escapeHtml } from '@/lib/utils';
import { CheckCircle, Circle } from 'lucide-react';

const STEPS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;
const STEP_LABELS: Record<string, string> = {
  PENDING: 'Order placed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
};

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/en/auth/sign-in');

  const { locale, id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!order) notFound();

  const currentIdx = STEPS.indexOf(order.status as typeof STEPS[number]);

  return (
    <div className="mx-auto max-w-narrow px-gutter py-8">
      <Link href={`/${locale}/account/orders/${order.id}`} className="text-sm text-muted-foreground hover:underline">
        ← Back to order
      </Link>
      <h1 className="mt-4 font-display text-display-sm">Track your order</h1>
      <p className="text-muted-foreground">Order #{escapeHtml(order.orderNumber)}</p>

      <ol className="mt-8 space-y-4">
        {STEPS.map((step, idx) => {
          const done = currentIdx >= idx || (step === 'PROCESSING' && order.status === 'PROCESSING');
          const active = order.status === step;
          return (
            <li key={step} className="flex items-center gap-3">
              {done ? <CheckCircle className="h-6 w-6 text-success" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
              <span className={active ? 'font-semibold' : ''}>{STEP_LABELS[step] ?? step}</span>
            </li>
          );
        })}
      </ol>

      {order.trackingNumber ? (
        <div className="mt-8 rounded-lg bg-muted p-4">
          <p className="text-sm font-medium">Tracking number</p>
          <code className="text-lg">{escapeHtml(order.trackingNumber)}</code>
        </div>
      ) : (
        <div className="mt-8 rounded-lg bg-muted p-4">
          <p className="font-medium">Not shipped yet</p>
          <p className="text-sm text-muted-foreground mt-1">We are preparing your order at our warehouse.</p>
        </div>
      )}
    </div>
  );
}
