import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { localeToPrisma, type AppLocale } from '@/lib/i18n';
import { CategoryProductsClient, type CatalogProduct } from '@/components/category/category-products-client';
import { CurrencyProvider } from '@/lib/currency/context';

export default async function CollectionPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as AppLocale;
  const prismaLocale = localeToPrisma(locale);

  const collection = await prisma.collection.findUnique({
    where: { slug, isActive: true },
    include: {
      translations: true,
      products: {
        include: {
          product: {
            include: {
              translations: true,
              variants: { where: { isActive: true } },
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!collection) notFound();

  const t = collection.translations.find((tr) => tr.locale === prismaLocale) ?? collection.translations[0];

  const catalogProducts: CatalogProduct[] = collection.products
    .filter((cp) => cp.product.status === 'ACTIVE')
    .map((cp) => {
      const p = cp.product;
      const pt = p.translations.find((tr) => tr.locale === prismaLocale) ?? p.translations[0];
      return {
        id: p.id,
        slug: p.slug,
        name: pt?.name ?? p.slug,
        imageUrl: p.images[0]?.url,
        averageRating: p.averageRating ? Number(p.averageRating) : 0,
        reviewCount: p.reviewCount,
        variants: p.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          stockQuantity: v.stockQuantity,
          priceEurCents: v.priceEurCents,
          priceGbpCents: v.priceGbpCents,
          salePriceEurCents: v.salePriceEurCents,
          salePriceGbpCents: v.salePriceGbpCents,
        })),
      };
    });

  return (
    <CurrencyProvider>
      <div className="mx-auto max-w-content px-gutter md:px-gutter-lg py-8">
        <nav className="text-sm text-muted-foreground mb-4">
          <Link href={`/${locale}`}>Home</Link>
          {' / '}
          <Link href={`/${locale}/collections`}>Collections</Link>
          {' / '}
          <span>{t?.name}</span>
        </nav>

        {collection.heroImageUrl && (
          <div className="aspect-[3/1] rounded-2xl overflow-hidden mb-8">
            <img src={collection.heroImageUrl} alt={t?.name ?? ''} className="h-full w-full object-cover" />
          </div>
        )}

        <h1 className="font-display text-display-lg">{t?.name}</h1>
        {t?.description && <p className="mt-2 text-muted-foreground max-w-2xl">{t.description}</p>}

        <div className="mt-8">
          <CategoryProductsClient locale={locale} products={catalogProducts} />
        </div>
      </div>
    </CurrencyProvider>
  );
}
