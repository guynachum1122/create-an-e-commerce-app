import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCartItems, getGuestSessionId, serializeCart } from '@/lib/cart/service';
import { snapshotAbandonedCart } from '@/lib/abandoned-cart';
import { csrfGuard } from '@/lib/security/csrf';
import { abandonedCartSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = abandonedCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const session = await auth();
    const guestSessionId = session?.user?.id ? undefined : await getGuestSessionId();
    const { items } = await getCartItems(session?.user?.id, guestSessionId);

    if (!items.length) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await snapshotAbandonedCart({
      userId: session?.user?.id,
      sessionId: guestSessionId,
      email: parsed.data.email,
      cartSnapshot: serializeCart(items),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
