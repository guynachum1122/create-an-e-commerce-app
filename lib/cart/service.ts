import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import type { Currency } from '@prisma/client';
import { getEffectivePrice } from '@/lib/i18n';

const GUEST_CART_COOKIE = 'guest_cart_id';

export async function getGuestSessionId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_CART_COOKIE)?.value;
}

export async function setGuestSessionId(id: string) {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_CART_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
}

async function ensureGuestSession(): Promise<string> {
  let id = await getGuestSessionId();
  if (!id) {
    id = crypto.randomUUID();
    await setGuestSessionId(id);
  }
  return id;
}

export async function getCartItems(userId?: string, guestSessionId?: string) {
  const sessionId = userId ? undefined : guestSessionId ?? (await ensureGuestSession());

  const items = await prisma.cartItem.findMany({
    where: userId ? { userId } : { sessionId },
    include: {
      variant: {
        include: {
          product: {
            include: {
              translations: true,
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            },
          },
        },
      },
    },
  });

  return { items, sessionId };
}

export async function mergeGuestCart(userId: string, guestSessionId: string) {
  const guestItems = await prisma.cartItem.findMany({
    where: { sessionId: guestSessionId },
    include: { variant: true },
  });

  for (const guestItem of guestItems) {
    const existing = await prisma.cartItem.findUnique({
      where: { userId_variantId: { userId, variantId: guestItem.variantId } },
    });
    const maxQty = guestItem.variant.stockQuantity;
    const newQty = existing
      ? Math.min(existing.quantity + guestItem.quantity, maxQty)
      : Math.min(guestItem.quantity, maxQty);

    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
    } else if (newQty > 0) {
      await prisma.cartItem.create({ data: { userId, variantId: guestItem.variantId, quantity: newQty } });
    }
    await prisma.cartItem.delete({ where: { id: guestItem.id } });
  }
}

export function serializeCart(
  items: Awaited<ReturnType<typeof getCartItems>>['items'],
  currency: Currency = 'EUR',
  locale: 'EN' | 'HE' = 'EN',
) {
  const mapped = items.map((item) => {
    const translation = item.variant.product.translations.find((t) => t.locale === locale)
      ?? item.variant.product.translations[0];
    const pricing = getEffectivePrice(item.variant, currency);
    return {
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      productName: translation?.name ?? item.variant.product.slug,
      productSlug: item.variant.product.slug,
      sku: item.variant.sku,
      size: item.variant.size,
      color: item.variant.color,
      priceCents: pricing.price,
      regularPriceCents: pricing.regular,
      onSale: pricing.onSale,
      stockQuantity: item.variant.stockQuantity,
      imageUrl: item.variant.product.images[0]?.url ?? null,
      lineTotalCents: pricing.price * item.quantity,
    };
  });

  return {
    items: mapped,
    itemCount: mapped.reduce((sum, i) => sum + i.quantity, 0),
    subtotalCents: mapped.reduce((sum, i) => sum + i.lineTotalCents, 0),
  };
}
