import { prisma } from '@/lib/db';
import { auth, requireStaff } from '@/auth';
import { escapeHtml } from '@/lib/utils';
import { ReturnActions } from '@/components/admin/return-actions';

export default async function AdminReturnsPage() {
  await requireStaff();
  const session = await auth();
  const isAdmin = session?.user?.role === 'ADMIN';

  const returns = await prisma.returnRequest.findMany({
    include: {
      order: { select: { orderNumber: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Return requests</h1>
      <div className="space-y-4">
        {returns.map((r) => (
          <div key={r.id} className="rounded-lg border p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">Order {escapeHtml(r.order.orderNumber)}</p>
                <p className="text-sm text-muted-foreground">{escapeHtml(r.user.name)} — {escapeHtml(r.user.email ?? '')}</p>
                <p className="text-sm mt-2">{escapeHtml(r.reason)}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-muted">{r.status}</span>
            </div>
            {r.status === 'PENDING' && isAdmin && <ReturnActions returnId={r.id} />}
            {r.status === 'PENDING' && !isAdmin && (
              <p className="mt-2 text-xs text-muted-foreground">Awaiting admin approval</p>
            )}
          </div>
        ))}
        {returns.length === 0 && <p className="text-muted-foreground">No return requests</p>}
      </div>
    </div>
  );
}
