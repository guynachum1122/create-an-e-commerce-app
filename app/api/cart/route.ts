import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getCartItems, getGuestSessionId, serializeCart, setGuestSessionId } from '@/lib/cart/service';
import { verifyCartItemOwnership } from '@/lib/cart/ownership';
import { csrfGuard } from '@/lib/security/csrf';
import { cartPostSchema, cartPatchSchema, cartDeleteSchema } from '@/lib/validations';
import { snapshotAbandonedCart } from '@/lib/abandoned-cart';

export async function GET() {
  try {
    const session = await auth();
    const guestSessionId = session?.user?.id ? undefined : await getGuestSessionId();
    const { items, sessionId } = await getCartItems(session?.user?.id, guestSessionId);
    const res = NextResponse.json(serializeCart(items));
    if (sessionId && !session?.user?.id) {
      res.cookies.set('guest_cart_id', sessionId, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
    return res;
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to load cart' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = cartPostSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const { variantId, quantity } = parsed.data;
    const variant = await prisma.variant.findUnique({ where: { id: variantId } });
    if (!variant || variant.stockQuantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 422 });
    }

    const session = await auth();
    let guestSessionId = session?.user?.id ? undefined : await getGuestSessionId();
    if (!session?.user?.id && !guestSessionId) {
      guestSessionId = crypto.randomUUID();
      await setGuestSessionId(guestSessionId);
    }

    const userId = session?.user?.id;
    const existing = userId
      ? await prisma.cartItem.findUnique({ where: { userId_variantId: { userId, variantId } } })
      : await prisma.cartItem.findUnique({ where: { sessionId_variantId: { sessionId: guestSessionId!, variantId } } });

    const newQty = existing ? existing.quantity + quantity : quantity;
    if (newQty > variant.stockQuantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 422 });
    }

    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
    } else {
      await prisma.cartItem.create({
        data: userId ? { userId, variantId, quantity } : { sessionId: guestSessionId!, variantId, quantity },
      });
    }

    const { items } = await getCartItems(userId, guestSessionId);
    const email = session?.user?.email ?? undefined;
    await snapshotAbandonedCart({
      userId,
      sessionId: guestSessionId,
      email,
      cartSnapshot: serializeCart(items),
    });

    return NextResponse.json(serializeCart(items));
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = cartPatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const { itemId, quantity } = parsed.data;
    const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: { variant: true } });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    if (!(await verifyCartItemOwnership(item))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (quantity < 1) {
      await prisma.cartItem.delete({ where: { id: itemId } });
    } else if (quantity > item.variant.stockQuantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 422 });
    } else {
      await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    }

    const session = await auth();
    const guestSessionId = session?.user?.id ? undefined : await getGuestSessionId();
    const { items } = await getCartItems(session?.user?.id, guestSessionId);
    return NextResponse.json(serializeCart(items));
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = cartDeleteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const item = await prisma.cartItem.findUnique({ where: { id: parsed.data.itemId } });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    if (!(await verifyCartItemOwnership(item))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.cartItem.delete({ where: { id: parsed.data.itemId } });

    const session = await auth();
    const guestSessionId = session?.user?.id ? undefined : await getGuestSessionId();
    const { items } = await getCartItems(session?.user?.id, guestSessionId);
    return NextResponse.json(serializeCart(items));
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}
