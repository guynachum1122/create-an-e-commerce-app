import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getDictionary, localeToPrisma, type AppLocale } from '@/lib/i18n';
import { CategoryProductsClient, type CatalogProduct } from '@/components/category/category-products-client';
import { CurrencyProvider } from '@/lib/currency/context';
import { JsonLd } from '@/components/seo/structured-data';

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as AppLocale;
  const prismaLocale = localeToPrisma(locale);
  const dict = getDictionary(locale);

  const category = await prisma.category.findUnique({
    where: { slug, isActive: true },
    include: {
      translations: true,
      parent: { include: { translations: true } },
      children: { where: { isActive: true } },
    },
  });
  if (!category) notFound();

  const t = category.translations.find((tr) => tr.locale === prismaLocale) ?? category.translations[0];

  const categoryIds = [category.id, ...category.children.map((c) => c.id)];
  const products = await prisma.product.findMany({
    where: { categoryId: { in: categoryIds }, status: 'ACTIVE' },
    include: {
      translations: true,
      variants: { where: { isActive: true } },
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  const catalogProducts: CatalogProduct[] = products.map((product) => {
    const pt = product.translations.find((tr) => tr.locale === prismaLocale) ?? product.translations[0];
    return {
      id: product.id,
      slug: product.slug,
      name: pt?.name ?? product.slug,
      imageUrl: product.images[0]?.url,
      averageRating: product.averageRating ? Number(product.averageRating) : 0,
      reviewCount: product.reviewCount,
      variants: product.variants.map((v) => ({
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

  const parentT = category.parent?.translations.find((tr) => tr.locale === prismaLocale) ?? category.parent?.translations[0];
  const breadcrumbs = [
    { name: dict['breadcrumb.home'] ?? 'Home', url: `/${locale}` },
    ...(category.parent ? [{ name: parentT?.name ?? category.parent.slug, url: `/${locale}/category/${category.parent.slug}` }] : []),
    { name: t?.name ?? category.slug, url: `/${locale}/category/${category.slug}` },
  ];

  return (
    <CurrencyProvider>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((b, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: b.name,
              item: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}${b.url}`,
            })),
          },
        ],
      }} />
      <div className="mx-auto max-w-content px-gutter md:px-gutter-lg py-8">
        <nav className="text-sm text-muted-foreground mb-4">
          {breadcrumbs.map((b, i) => (
            <span key={b.url}>
              {i > 0 && ' / '}
              {i < breadcrumbs.length - 1 ? <Link href={b.url}>{b.name}</Link> : <span>{b.name}</span>}
            </span>
          ))}
        </nav>
        <h1 className="font-display text-display-md">{t?.name}</h1>
        {t?.description && <p className="mt-2 text-muted-foreground max-w-2xl">{t.description}</p>}

        <div className="mt-8">
          <CategoryProductsClient locale={locale} products={catalogProducts} />
        </div>
      </div>
    </CurrencyProvider>
  );
}
