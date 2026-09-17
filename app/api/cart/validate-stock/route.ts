import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCartItems, getGuestSessionId } from '@/lib/cart/service';
import { validateCartStock } from '@/lib/stock';
import { csrfGuard } from '@/lib/security/csrf';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const session = await auth();
  const guestSessionId = session?.user?.id ? undefined : await getGuestSessionId();
  const { items } = await getCartItems(session?.user?.id, guestSessionId);

  if (!items.length) {
    return NextResponse.json({ ok: true });
  }

  const result = await validateCartStock(
    items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      sku: item.variant.sku,
    })),
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: `Out of stock: ${result.sku}`, sku: result.sku },
      { status: 422 },
    );
  }

  return NextResponse.json({ ok: true });
}
