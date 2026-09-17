import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/auth';
import { ProductForm } from '@/components/admin/product-form';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { translations: true, variants: true, images: { where: { variantId: null }, take: 1 } },
  });
  if (!product) notFound();

  const categories = await prisma.category.findMany({
    include: { translations: true },
    orderBy: { sortOrder: 'asc' },
  });

  const en = product.translations.find((t) => t.locale === 'EN');
  const he = product.translations.find((t) => t.locale === 'HE');

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit product</h1>
        <Link href="/admin/products" className="text-sm text-primary underline">← Back</Link>
      </div>
      <ProductForm
        productId={product.id}
        categories={categories.map((c) => ({ id: c.id, name: c.translations[0]?.name ?? c.slug }))}
        initial={{
          slug: product.slug,
          status: product.status,
          categoryId: product.categoryId,
          nameEn: en?.name ?? '',
          nameHe: he?.name ?? '',
          shortDescriptionEn: en?.shortDescription ?? '',
          shortDescriptionHe: he?.shortDescription ?? '',
          descriptionEn: en?.description ?? '',
          descriptionHe: he?.description ?? '',
          sizeFitGuideEn: en?.sizeFitGuide ?? '',
          careInstructionsEn: en?.careInstructions ?? '',
          materialsEn: en?.materials ?? '',
          imageUrl: product.images[0]?.url ?? 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800',
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex ?? '#CCCCCC',
            stockQuantity: v.stockQuantity,
            priceEurCents: v.priceEurCents,
            priceGbpCents: v.priceGbpCents,
            salePriceEurCents: v.salePriceEurCents?.toString() ?? '',
            salePriceGbpCents: v.salePriceGbpCents?.toString() ?? '',
          })),
        }}
      />
    </div>
  );
}
