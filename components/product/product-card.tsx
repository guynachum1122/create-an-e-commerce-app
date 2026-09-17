'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, getDictionary } from '@/lib/i18n';
import type { AppLocale } from '@/lib/i18n';
import { StarRating } from '@/components/product/star-rating';
import { useCartStore } from '@/stores/cart-store';
import { toast } from 'sonner';

interface VariantOption {
  id: string;
  size: string;
  color: string;
  stockQuantity: number;
}

interface Props {
  locale: AppLocale;
  slug: string;
  name: string;
  imageUrl?: string;
  priceCents: number;
  regularPriceCents?: number;
  onSale?: boolean;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
  currency?: 'EUR' | 'GBP';
  productId?: string;
  variants?: VariantOption[];
}

export function ProductCard({
  locale, slug, name, imageUrl, priceCents, regularPriceCents, onSale, inStock,
  rating, reviewCount, currency = 'EUR', variants = [],
}: Props) {
  const { addItem } = useCartStore();
  const [showPicker, setShowPicker] = useState(false);
  const hasMultipleVariants = variants.length > 1;
  const dict = getDictionary(locale);

  async function quickAdd(variantId?: string) {
    const target = variantId ?? variants.find((v) => v.stockQuantity > 0)?.id;
    if (!target) return;
    if (hasMultipleVariants && !variantId) {
      setShowPicker(true);
      return;
    }
    await addItem(target, 1);
    toast.success(dict['product.addedToCart'] ?? 'Added to cart');
    setShowPicker(false);
  }

  return (
    <div className="group rounded-xl bg-card shadow-card overflow-hidden hover:shadow-card-hover transition-shadow relative">
      <Link href={`/${locale}/products/${slug}`}>
        <div className="relative aspect-[4/5] bg-muted overflow-hidden">
          {imageUrl && <img src={imageUrl} alt={name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />}
          <div className="absolute top-2 start-2 flex flex-col gap-1">
            {onSale && <Badge className="bg-primary">{dict['product.onSale'] ?? 'Sale'}</Badge>}
            {inStock === false && <Badge variant="error">{dict['product.outOfStock'] ?? 'Out of stock'}</Badge>}
          </div>
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/${locale}/products/${slug}`}>
          <h3 className="text-sm font-medium line-clamp-2">{name}</h3>
        </Link>
        {rating != null && rating > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <StarRating rating={rating} size={14} />
            {reviewCount != null && reviewCount > 0 && <span className="text-caption text-muted-foreground">({reviewCount})</span>}
          </div>
        )}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-semibold tabular-nums">{formatPrice(priceCents, currency)}</span>
          {onSale && regularPriceCents != null && (
            <span className="text-sm text-muted-foreground line-through tabular-nums">{formatPrice(regularPriceCents, currency)}</span>
          )}
        </div>
        {inStock !== false && (
          <div className="hidden md:block mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" className="w-full" onClick={() => quickAdd()}>{dict['product.quickAdd'] ?? 'Quick add'}</Button>
          </div>
        )}
      </div>
      {showPicker && (
        <div className="absolute inset-0 bg-card/95 p-4 flex flex-col justify-center z-10">
          <p className="text-sm font-medium mb-2">Select variant</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {variants.filter((v) => v.stockQuantity > 0).map((v) => (
              <button key={v.id} type="button" className="w-full text-start text-sm rounded-md border p-2 hover:bg-muted" onClick={() => quickAdd(v.id)}>
                {v.size} / {v.color}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowPicker(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}
