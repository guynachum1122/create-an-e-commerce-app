'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getDictionary, type AppLocale } from '@/lib/i18n';
import { Trash2 } from 'lucide-react';

interface WishlistItem {
  id: string;
  product: { slug: string; translations: { name: string }[]; images: { url: string }[] };
}

export default function WishlistPage() {
  const { locale } = useParams();
  const dict = getDictionary(locale as AppLocale);
  const [items, setItems] = useState<WishlistItem[]>([]);

  async function load() {
    const res = await fetch('/api/wishlist');
    const d = await res.json();
    setItems(d.items ?? []);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    await fetch('/api/wishlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-content px-gutter py-8">
      <h1 className="font-display text-display-sm">{dict['nav.wishlist']}</h1>
      {items.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p>{dict['wishlist.empty'] ?? 'Your wishlist is empty'}</p>
          <Link href={`/${locale}/collections`} className="mt-4 inline-block text-primary underline">{dict['wishlist.browse'] ?? 'Browse collections'}</Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border overflow-hidden relative group">
              <Link href={`/${locale}/products/${item.product.slug}`}>
                {item.product.images[0] && <img src={item.product.images[0].url} alt="" className="aspect-square object-cover w-full" />}
                <p className="p-3 text-sm font-medium">{item.product.translations[0]?.name}</p>
              </Link>
              <Button variant="ghost" size="icon" className="absolute top-2 end-2 opacity-0 group-hover:opacity-100" onClick={() => remove(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
