'use client';

import { useMemo, useState } from 'react';
import { ProductCard } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCurrency } from '@/lib/currency/context';
import { formatPrice, getEffectivePrice } from '@/lib/i18n';
import type { AppLocale } from '@/lib/i18n';
import { getDictionary } from '@/lib/i18n';

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
  averageRating: number;
  reviewCount: number;
  variants: {
    id: string;
    size: string;
    color: string;
    colorHex: string | null;
    stockQuantity: number;
    priceEurCents: number;
    priceGbpCents: number;
    salePriceEurCents: number | null;
    salePriceGbpCents: number | null;
  }[];
}

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'rating';

interface Props {
  locale: AppLocale;
  products: CatalogProduct[];
  showFilters?: boolean;
}

export function CategoryProductsClient({ locale, products, showFilters = true }: Props) {
  const dict = getDictionary(locale) as Record<string, string>;
  const { currency } = useCurrency();
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>('newest');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const allSizes = [...new Set(products.flatMap((p) => p.variants.map((v) => v.size)))].sort();
  const allColors = [...new Set(products.flatMap((p) => p.variants.map((v) => v.color)))].sort();

  const filtered = useMemo(() => {
    let list = products.map((p) => {
      const variant = p.variants.find((v) => v.stockQuantity > 0) ?? p.variants[0];
      const pricing = variant ? getEffectivePrice(variant, currency) : { price: 0, regular: 0, onSale: false };
      return { ...p, variant, pricing, inStock: p.variants.some((v) => v.stockQuantity > 0) };
    });

    const minCents = priceMin ? Math.round(parseFloat(priceMin) * 100) : null;
    const maxCents = priceMax ? Math.round(parseFloat(priceMax) * 100) : null;

    list = list.filter((p) => {
      if (minCents != null && p.pricing.price < minCents) return false;
      if (maxCents != null && p.pricing.price > maxCents) return false;
      if (inStockOnly && !p.inStock) return false;
      if (onSaleOnly && !p.pricing.onSale) return false;
      if (sizes.length && !p.variants.some((v) => sizes.includes(v.size))) return false;
      if (colors.length && !p.variants.some((v) => colors.includes(v.color))) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sort === 'price-asc') return a.pricing.price - b.pricing.price;
      if (sort === 'price-desc') return b.pricing.price - a.pricing.price;
      if (sort === 'rating') return b.averageRating - a.averageRating;
      return 0;
    });

    return list;
  }, [products, currency, priceMin, priceMax, sizes, colors, inStockOnly, onSaleOnly, sort]);

  function toggleSize(s: string) {
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleColor(c: string) {
    setColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium">{dict['catalog.filter.price'] ?? 'Price range'}</Label>
        <div className="mt-2 flex gap-2">
          <input type="number" placeholder="Min" className="w-full h-9 rounded-md border px-2 text-sm" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
          <input type="number" placeholder="Max" className="w-full h-9 rounded-md border px-2 text-sm" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
        </div>
      </div>
      {allSizes.length > 1 && (
        <div>
          <Label className="text-sm font-medium">{dict['catalog.filter.size'] ?? 'Size'}</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {allSizes.map((s) => (
              <button key={s} type="button" onClick={() => toggleSize(s)} className={`rounded-full px-3 py-1 text-xs border ${sizes.includes(s) ? 'bg-brand-terracotta-muted border-brand-terracotta/30 text-brand-terracotta' : 'bg-muted'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {allColors.length > 1 && (
        <div>
          <Label className="text-sm font-medium">{dict['catalog.filter.color'] ?? 'Color'}</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {allColors.map((c) => (
              <button key={c} type="button" onClick={() => toggleColor(c)} className={`rounded-full px-3 py-1 text-xs border ${colors.includes(c) ? 'bg-brand-terracotta-muted border-brand-terracotta/30' : 'bg-muted'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Checkbox id="inStock" checked={inStockOnly} onCheckedChange={(v) => setInStockOnly(v === true)} />
        <Label htmlFor="inStock">{dict['catalog.filter.inStock'] ?? 'In stock only'}</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="onSale" checked={onSaleOnly} onCheckedChange={(v) => setOnSaleOnly(v === true)} />
        <Label htmlFor="onSale">{dict['catalog.filter.onSale'] ?? 'On sale'}</Label>
      </div>
      <Button variant="ghost" size="sm" onClick={() => { setPriceMin(''); setPriceMax(''); setSizes([]); setColors([]); setInStockOnly(false); setOnSaleOnly(false); }}>
        {dict['catalog.filter.clear'] ?? 'Clear all'}
      </Button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <p className="text-sm text-muted-foreground">{filtered.length} {dict['catalog.results'] ?? 'results'}</p>
        <div className="flex items-center gap-2">
          {showFilters && (
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}>
              {dict['catalog.filters'] ?? 'Filters'}
            </Button>
          )}
          <select className="h-9 rounded-md border px-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
            <option value="newest">{dict['catalog.sort.newest'] ?? 'Newest'}</option>
            <option value="price-asc">{dict['catalog.sort.priceAsc'] ?? 'Price: Low to High'}</option>
            <option value="price-desc">{dict['catalog.sort.priceDesc'] ?? 'Price: High to Low'}</option>
            <option value="rating">{dict['catalog.sort.rating'] ?? 'Rating'}</option>
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        {showFilters && (
          <aside className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block w-64 shrink-0`}>
            {filterPanel}
          </aside>
        )}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">{dict['search.empty'] ?? 'No products match your filters.'}</p>
              <Button variant="outline" className="mt-4" onClick={() => { setPriceMin(''); setPriceMax(''); setSizes([]); setColors([]); setInStockOnly(false); setOnSaleOnly(false); }}>
                {dict['catalog.filter.clear'] ?? 'Clear filters'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  locale={locale}
                  slug={p.slug}
                  name={p.name}
                  imageUrl={p.imageUrl}
                  priceCents={p.pricing.price}
                  regularPriceCents={p.pricing.regular}
                  onSale={p.pricing.onSale}
                  inStock={p.inStock}
                  rating={p.averageRating > 0 ? p.averageRating : undefined}
                  reviewCount={p.reviewCount}
                  currency={currency}
                  productId={p.id}
                  variants={p.variants}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
