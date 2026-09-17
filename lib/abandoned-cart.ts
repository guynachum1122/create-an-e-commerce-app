import { prisma } from '@/lib/db';
import { config } from '@/lib/config';

export async function snapshotAbandonedCart(params: {
  userId?: string;
  sessionId?: string;
  email?: string;
  cartSnapshot: unknown;
}) {
  if (!params.email && !params.userId) return;

  await prisma.abandonedCart.upsert({
    where: { id: `${params.userId ?? params.sessionId}-active` },
    create: {
      id: `${params.userId ?? params.sessionId}-active`,
      userId: params.userId,
      sessionId: params.sessionId,
      email: params.email,
      cartSnapshot: params.cartSnapshot as object,
      status: 'ACTIVE',
      lastActivityAt: new Date(),
    },
    update: {
      cartSnapshot: params.cartSnapshot as object,
      lastActivityAt: new Date(),
    },
  }).catch(async () => {
    await prisma.abandonedCart.create({
      data: {
        userId: params.userId,
        sessionId: params.sessionId,
        email: params.email,
        cartSnapshot: params.cartSnapshot as object,
        status: 'ACTIVE',
        lastActivityAt: new Date(),
      },
    });
  });
}

export async function markStaleAbandonedCarts() {
  const cutoff = new Date(Date.now() - config.abandonedCartHours * 60 * 60 * 1000);
  await prisma.abandonedCart.updateMany({
    where: { lastActivityAt: { lt: cutoff }, status: 'ACTIVE' },
    data: { status: 'EXPIRED' },
  });
}
