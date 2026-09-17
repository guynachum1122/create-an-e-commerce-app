import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { reviewSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }

  const { productId, orderId, orderItemId, stars } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id, status: 'DELIVERED' },
    include: { items: true },
  });
  if (!order || !order.items.some((i) => i.id === orderItemId && i.productId === productId)) {
    return NextResponse.json({ error: 'Not eligible to rate' }, { status: 403 });
  }

  await prisma.review.upsert({
    where: { userId_productId: { userId: session.user.id, productId } },
    create: { userId: session.user.id, productId, orderId, orderItemId, stars },
    update: { stars },
  });

  const agg = await prisma.review.aggregate({ where: { productId }, _avg: { stars: true }, _count: true });
  await prisma.product.update({
    where: { id: productId },
    data: { averageRating: agg._avg.stars, reviewCount: agg._count },
  });

  return NextResponse.json({ ok: true });
}
