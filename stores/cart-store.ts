'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItemState {
  id: string;
  variantId: string;
  quantity: number;
  productName: string;
  productSlug: string;
  sku: string;
  size?: string;
  color?: string;
  priceCents: number;
  stockQuantity: number;
  imageUrl: string | null;
  lineTotalCents: number;
}

interface CartStore {
  items: CartItemState[];
  itemCount: number;
  subtotalCents: number;
  isOpen: boolean;
  checkoutStep: number;
  checkoutData: Record<string, unknown>;
  setCart: (data: { items: CartItemState[]; itemCount: number; subtotalCents: number }) => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  setCheckoutStep: (step: number) => void;
  setCheckoutData: (data: Record<string, unknown>) => void;
  resetCheckout: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      itemCount: 0,
      subtotalCents: 0,
      isOpen: false,
      checkoutStep: 1,
      checkoutData: {},
      setCart: (data) => set({ ...data }),
      addItem: async (variantId, quantity = 1) => {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId, quantity }),
        });
        if (res.ok) {
          const data = await res.json();
          set({ items: data.items, itemCount: data.itemCount, subtotalCents: data.subtotalCents, isOpen: true });
        }
      },
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      setCheckoutStep: (step) => set({ checkoutStep: step }),
      setCheckoutData: (data) => set((state) => ({ checkoutData: { ...state.checkoutData, ...data } })),
      resetCheckout: () => set({ checkoutStep: 1, checkoutData: {} }),
    }),
    {
      name: 'kitchen-me-checkout',
      partialize: (state) => ({ checkoutStep: state.checkoutStep, checkoutData: state.checkoutData }),
    },
  ),
);
