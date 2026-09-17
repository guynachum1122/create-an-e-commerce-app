import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { csrfGuard } from '@/lib/security/csrf';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = await checkRateLimit('account:export', session.user.id);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const userId = session.user.id;
  const [user, orders, wishlist, consents, savedPayments, reviews, returnRequests, abandonedCarts] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          phone: true,
          accountType: true,
          preferredLocale: true,
          createdAt: true,
          address: true,
        },
      }),
      prisma.order.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wishlistItem.findMany({
        where: { userId },
        include: { product: { include: { translations: true } } },
      }),
      prisma.cookieConsent.findMany({ where: { userId }, orderBy: { consentedAt: 'desc' }, take: 5 }),
      prisma.savedPaymentMethod.findMany({
        where: { userId },
        select: { id: true, type: true, label: true, isDefault: true },
      }),
      prisma.review.findMany({
        where: { userId },
        select: { productId: true, stars: true, createdAt: true },
      }),
      prisma.returnRequest.findMany({
        where: { userId },
        select: { orderId: true, reason: true, status: true, createdAt: true },
      }),
      prisma.abandonedCart.findMany({
        where: { userId },
        select: { cartSnapshot: true, status: true, lastActivityAt: true },
      }),
    ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    profile: user,
    orders,
    wishlist: wishlist.map((w) => ({
      productId: w.productId,
      productName: w.product.translations[0]?.name,
      createdAt: w.createdAt,
    })),
    cookieConsents: consents,
    savedPayments,
    reviews,
    returnRequests,
    abandonedCarts,
  });
}
