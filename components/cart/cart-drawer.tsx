'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';
import { formatPrice, getDictionary, type AppLocale } from '@/lib/i18n';
import { useCurrency } from '@/lib/currency/context';
import { toast } from 'sonner';

export function CartDrawer({ locale }: { locale: string }) {
  const dict = getDictionary(locale as AppLocale);
  const { currency } = useCurrency();
  const { items, itemCount, subtotalCents, isOpen, closeCart, setCart, openCart } = useCartStore();

  async function updateQuantity(itemId: string, quantity: number) {
    const res = await fetch('/api/cart', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId, quantity }) });
    if (res.ok) setCart(await res.json());
    else toast.error("Couldn't update item");
  }

  async function removeItem(itemId: string) {
    const res = await fetch('/api/cart', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId }) });
    if (res.ok) { setCart(await res.json()); toast.success('Removed'); }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? openCart() : closeCart())}>
      <SheetContent side="right" className="flex flex-col w-full max-w-md">
        <SheetHeader><SheetTitle>{dict['cart.title']} ({itemCount})</SheetTitle></SheetHeader>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold">{dict['cart.empty.headline']}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{dict['cart.empty.body']}</p>
            <Button className="mt-6" onClick={closeCart} asChild><Link href={`/${locale}/collections`}>{dict['cart.continue']}</Link></Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto space-y-4 py-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  {item.imageUrl && <img src={item.imageUrl} alt="" className="h-16 w-16 rounded-md object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.size} · {item.color}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}><Minus className="h-3 w-3" /></Button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stockQuantity}><Plus className="h-3 w-3" /></Button>
                      <button className="ms-auto text-xs text-destructive" onClick={() => removeItem(item.id)}>Remove</button>
                    </div>
                  </div>
                  <p className="text-sm font-medium tabular-nums">{formatPrice(item.lineTotalCents, currency)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between font-semibold"><span>Subtotal</span><span className="tabular-nums">{formatPrice(subtotalCents, currency)}</span></div>
              <p className="text-caption text-muted-foreground">{dict['cart.taxNote']}</p>
              <Button className="w-full" asChild onClick={closeCart}><Link href={`/${locale}/checkout/address`}>{dict['cart.checkout']}</Link></Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
