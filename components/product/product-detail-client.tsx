'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/product/star-rating';
import { useCartStore } from '@/stores/cart-store';
import { formatPrice, getEffectivePrice } from '@/lib/i18n';
import type { AppLocale } from '@/lib/i18n';
import { getDictionary } from '@/lib/i18n';
import { useCurrency } from '@/lib/currency/context';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import { trackUserAction, AnalyticsEvents } from '@/lib/analytics';

interface Variant {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string | null;
  stockQuantity: number;
  priceEurCents: number;
  priceGbpCents: number;
  salePriceEurCents: number | null;
  salePriceGbpCents: number | null;
}

interface Props {
  locale: AppLocale;
  product: {
    id: string;
    slug: string;
    name: string;
    description: string;
    sizeFitGuide: string;
    careInstructions: string;
    materials: string;
    averageRating: number;
    reviewCount: number;
    images: { id: string; url: string; altText: string | null; variantId: string | null }[];
    variants: Variant[];
  };
}

export function ProductDetailClient({ locale, product }: Props) {
  const dict = getDictionary(locale);
  const { currency } = useCurrency();
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]);
  const [selectedImage, setSelectedImage] = useState(product.images[0]?.url);
  const [qty, setQty] = useState(1);
  const { addItem } = useCartStore();

  const variantPricing = selectedVariant
    ? getEffectivePrice(selectedVariant, currency)
    : { price: 0, regular: 0, onSale: false };

  const sizes = [...new Set(product.variants.map((v) => v.size))];
  const colors = [...new Set(product.variants.map((v) => v.color))];

  const selectVariant = (size: string, color: string) => {
    const v = product.variants.find((x) => x.size === size && x.color === color);
    if (v) {
      setSelectedVariant(v);
      const variantImage = product.images.find((i) => i.variantId === v.id)?.url;
      if (variantImage) setSelectedImage(variantImage);
    }
  };

  const handleAdd = async () => {
    if (!selectedVariant || selectedVariant.stockQuantity < qty) return;
    await addItem(selectedVariant.id, qty);
    trackUserAction(AnalyticsEvents.ADD_TO_CART, { productId: product.id, variantId: selectedVariant.id });
    toast.success(dict['product.addedToCart'] ?? 'Added to cart');
  };

  async function handleWishlist() {
    if (!session) {
      router.push(`/${locale}/auth/sign-in`);
      return;
    }
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, variantId: selectedVariant?.id }),
    });
    if (res.ok) toast.success(dict['wishlist.added'] ?? 'Added to wishlist');
    else toast.error(dict['wishlist.error'] ?? 'Could not add to wishlist');
  }

  return (
    <div className="mx-auto max-w-content px-gutter md:px-gutter-lg py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
            {selectedImage && <img src={selectedImage} alt={product.name} className="h-full w-full object-cover" />}
          </div>
          {product.images.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {product.images.map((img) => (
                <button key={img.id} type="button" onClick={() => setSelectedImage(img.url)} className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${selectedImage === img.url ? 'border-primary' : 'border-transparent'}`}>
                  <img src={img.url} alt={img.altText ?? product.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <h1 className="font-display text-display-md">{product.name}</h1>
          {product.reviewCount > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <StarRating rating={product.averageRating} />
              <span className="text-sm text-muted-foreground">({product.reviewCount})</span>
            </div>
          )}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-xl font-semibold tabular-nums">{formatPrice(variantPricing.price, currency)}</span>
            {variantPricing.onSale && (
              <span className="text-muted-foreground line-through tabular-nums">{formatPrice(variantPricing.regular, currency)}</span>
            )}
            {variantPricing.onSale && <Badge>{dict['product.onSale']}</Badge>}
          </div>
          <p className="text-caption text-muted-foreground mt-1">{dict['product.taxIncluded']}</p>
          <p className="mt-2">
            {selectedVariant && selectedVariant.stockQuantity > 0 ? (
              <Badge className="bg-success-muted text-success">{dict['product.inStock']}</Badge>
            ) : (
              <Badge variant="error">{dict['product.outOfStock']}</Badge>
            )}
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">{dict['product.size'] ?? 'Size'}</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <Button key={s} variant={selectedVariant?.size === s ? 'default' : 'outline'} size="sm" onClick={() => selectVariant(s, selectedVariant?.color ?? colors[0])}>{s}</Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{dict['product.color'] ?? 'Color'}</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <Button key={c} variant={selectedVariant?.color === c ? 'default' : 'outline'} size="sm" onClick={() => selectVariant(selectedVariant?.size ?? sizes[0], c)}>{c}</Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Qty</label>
              <input type="number" min={1} max={selectedVariant?.stockQuantity ?? 1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-16 rounded-md border px-2 py-1" />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button className="flex-1" size="lg" disabled={!selectedVariant || selectedVariant.stockQuantity < 1} onClick={handleAdd}>
              {dict['product.addToCart']}
            </Button>
            <Button variant="outline" size="lg" onClick={handleWishlist} aria-label="Add to wishlist">
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          {product.sizeFitGuide && (
            <details className="mt-8 border rounded-lg p-4"><summary className="font-medium cursor-pointer">{dict['product.sizeFitGuide'] ?? 'Size & fit guide'}</summary><p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{product.sizeFitGuide}</p></details>
          )}
          {product.careInstructions && (
            <details className="mt-4 border rounded-lg p-4"><summary className="font-medium cursor-pointer">{dict['product.careInstructions'] ?? 'Care instructions'}</summary><p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{product.careInstructions}</p></details>
          )}
          {product.materials && (
            <details className="mt-4 border rounded-lg p-4"><summary className="font-medium cursor-pointer">{dict['product.materials'] ?? 'Materials'}</summary><p className="mt-2 text-sm text-muted-foreground">{product.materials}</p></details>
          )}
        </div>
      </div>
    </div>
  );
}
