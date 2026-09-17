import { auth } from '@/auth';
import { getGuestSessionId } from '@/lib/cart/service';
import type { CartItem } from '@prisma/client';

export async function verifyCartItemOwnership(item: CartItem): Promise<boolean> {
  const session = await auth();
  const guestSessionId = session?.user?.id ? undefined : await getGuestSessionId();

  if (session?.user?.id && item.userId === session.user.id) return true;
  if (guestSessionId && item.sessionId === guestSessionId) return true;
  return false;
}
