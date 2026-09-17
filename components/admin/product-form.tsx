'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VariantRow {
  id?: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stockQuantity: number;
  priceEurCents: number;
  priceGbpCents: number;
  salePriceEurCents: string;
  salePriceGbpCents: string;
}

interface ProductFormProps {
  productId?: string;
  initial?: {
    slug: string;
    status: string;
    categoryId: string;
    nameEn: string;
    nameHe: string;
    shortDescriptionEn: string;
    shortDescriptionHe: string;
    descriptionEn: string;
    descriptionHe: string;
    sizeFitGuideEn: string;
    careInstructionsEn: string;
    materialsEn: string;
    imageUrl: string;
    variants: VariantRow[];
  };
  categories: { id: string; name: string }[];
}

const emptyVariant = (): VariantRow => ({
  sku: '',
  size: 'One Size',
  color: 'Default',
  colorHex: '#CCCCCC',
  stockQuantity: 10,
  priceEurCents: 2999,
  priceGbpCents: 2699,
  salePriceEurCents: '',
  salePriceGbpCents: '',
});

export function ProductForm({ productId, initial, categories }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    slug: initial?.slug ?? '',
    status: initial?.status ?? 'DRAFT',
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    nameEn: initial?.nameEn ?? '',
    nameHe: initial?.nameHe ?? '',
    shortDescriptionEn: initial?.shortDescriptionEn ?? '',
    shortDescriptionHe: initial?.shortDescriptionHe ?? '',
    descriptionEn: initial?.descriptionEn ?? '',
    descriptionHe: initial?.descriptionHe ?? '',
    sizeFitGuideEn: initial?.sizeFitGuideEn ?? '',
    careInstructionsEn: initial?.careInstructionsEn ?? '',
    materialsEn: initial?.materialsEn ?? '',
    imageUrl: initial?.imageUrl ?? 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800',
    variants: initial?.variants?.length ? initial.variants : [emptyVariant()],
  });

  function updateVariant(index: number, patch: Partial<VariantRow>) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const url = productId ? `/api/admin/products/${productId}` : '/api/admin/products';
    const method = productId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Save failed');
      return;
    }
    router.push('/admin/products');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></div>
        <div>
          <Label>Status</Label>
          <select className="w-full h-11 rounded-md border px-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label>Category</Label>
          <select className="w-full h-11 rounded-md border px-3" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <fieldset className="space-y-3 border rounded-lg p-4">
        <legend className="font-medium px-1">English</legend>
        <div><Label>Name</Label><Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} required /></div>
        <div><Label>Short description</Label><Input value={form.shortDescriptionEn} onChange={(e) => setForm({ ...form, shortDescriptionEn: e.target.value })} /></div>
        <div><Label>Description</Label><textarea className="w-full min-h-24 rounded-md border px-3 py-2" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} /></div>
      </fieldset>

      <fieldset className="space-y-3 border rounded-lg p-4">
        <legend className="font-medium px-1">Hebrew</legend>
        <div><Label>Name</Label><Input value={form.nameHe} onChange={(e) => setForm({ ...form, nameHe: e.target.value })} dir="rtl" /></div>
        <div><Label>Short description</Label><Input value={form.shortDescriptionHe} onChange={(e) => setForm({ ...form, shortDescriptionHe: e.target.value })} dir="rtl" /></div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Size & fit guide</Label><textarea className="w-full min-h-20 rounded-md border px-3 py-2" value={form.sizeFitGuideEn} onChange={(e) => setForm({ ...form, sizeFitGuideEn: e.target.value })} /></div>
        <div><Label>Care instructions</Label><textarea className="w-full min-h-20 rounded-md border px-3 py-2" value={form.careInstructionsEn} onChange={(e) => setForm({ ...form, careInstructionsEn: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Materials</Label><Input value={form.materialsEn} onChange={(e) => setForm({ ...form, materialsEn: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Image URL</Label><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Variants</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, variants: [...form.variants, emptyVariant()] })}>Add variant</Button>
        </div>
        <div className="space-y-4">
          {form.variants.map((v, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-4 border rounded-lg p-3">
              <Input placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} />
              <Input placeholder="Size" value={v.size} onChange={(e) => updateVariant(i, { size: e.target.value })} />
              <Input placeholder="Color" value={v.color} onChange={(e) => updateVariant(i, { color: e.target.value })} />
              <Input type="number" placeholder="Stock" value={v.stockQuantity} onChange={(e) => updateVariant(i, { stockQuantity: Number(e.target.value) })} />
              <Input type="number" placeholder="EUR cents" value={v.priceEurCents} onChange={(e) => updateVariant(i, { priceEurCents: Number(e.target.value) })} />
              <Input type="number" placeholder="GBP cents" value={v.priceGbpCents} onChange={(e) => updateVariant(i, { priceGbpCents: Number(e.target.value) })} />
              <Input placeholder="Sale EUR" value={v.salePriceEurCents} onChange={(e) => updateVariant(i, { salePriceEurCents: e.target.value })} />
              <Input placeholder="Sale GBP" value={v.salePriceGbpCents} onChange={(e) => updateVariant(i, { salePriceGbpCents: e.target.value })} />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save product'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
