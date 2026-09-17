'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/stores/cart-store';

export function CartHydrator() {
  const { data: session, status } = useSession();
  const setCart = useCartStore((s) => s.setCart);
  const mergedRef = useRef(false);

  useEffect(() => {
    if (status === 'loading') return;

    async function loadCart() {
      if (session?.user?.id && !mergedRef.current) {
        mergedRef.current = true;
        await fetch('/api/cart/merge', { method: 'POST' }).catch(() => null);
      }

      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    }

    loadCart();
  }, [session, status, setCart]);

  return null;
}
