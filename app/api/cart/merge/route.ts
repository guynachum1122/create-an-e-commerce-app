import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { mergeGuestCart, getCartItems, getGuestSessionId, serializeCart } from '@/lib/cart/service';
import { csrfGuard } from '@/lib/security/csrf';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const guestSessionId = await getGuestSessionId();
  if (guestSessionId) await mergeGuestCart(session.user.id, guestSessionId);
  const { items } = await getCartItems(session.user.id);
  return NextResponse.json(serializeCart(items));
}
