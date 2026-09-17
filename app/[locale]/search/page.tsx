import Link from 'next/link';
import { searchProductIds } from '@/lib/search/service';
import type { AppLocale } from '@/lib/i18n';
import { getDictionary, localeToPrisma } from '@/lib/i18n';
import { prisma } from '@/lib/db';
import { CategoryProductsClient, type CatalogProduct } from '@/components/category/category-products-client';
import { CurrencyProvider } from '@/lib/currency/context';

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: localeParam } = await params;
  const { q = '' } = await searchParams;
  const locale = localeParam as AppLocale;
  const dict = getDictionary(locale);
  const prismaLocale = localeToPrisma(locale);

  const ids = q.trim() ? await searchProductIds(q.trim(), 48) : [];

  const [products, suggestedCategories] = await Promise.all([
    ids.length
      ? prisma.product.findMany({
          where: { id: { in: ids }, status: 'ACTIVE' },
          include: {
            translations: true,
            variants: { where: { isActive: true } },
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        })
      : Promise.resolve([]),
    q.trim() && ids.length === 0
      ? prisma.category.findMany({
          where: { isActive: true, parentId: null },
          include: { translations: true },
          take: 4,
          orderBy: { sortOrder: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  const orderMap = new Map(ids.map((id, i) => [id, i]));
  products.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  const catalogProducts: CatalogProduct[] = products.map((product) => {
    const t = product.translations.find((tr) => tr.locale === prismaLocale) ?? product.translations[0];
    return {
      id: product.id,
      slug: product.slug,
      name: t?.name ?? product.slug,
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

  return (
    <CurrencyProvider>
      <div className="mx-auto max-w-content px-gutter md:px-gutter-lg py-8">
        <h1 className="font-display text-display-sm">{dict['search.results']} &quot;{q}&quot;</h1>
        {!q.trim() ? (
          <p className="mt-8 text-muted-foreground">{dict['search.prompt'] ?? 'Enter a search term above.'}</p>
        ) : catalogProducts.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>{dict['search.empty']}</p>
            {suggestedCategories.length > 0 && (
              <div className="mt-8">
                <p className="font-medium text-foreground">{dict['search.suggestedCategories'] ?? 'Suggested categories'}</p>
                <ul className="mt-4 flex flex-wrap justify-center gap-3">
                  {suggestedCategories.map((cat) => {
                    const ct = cat.translations.find((tr) => tr.locale === prismaLocale) ?? cat.translations[0];
                    return (
                      <li key={cat.id}>
                        <Link href={`/${locale}/category/${cat.slug}`} className="text-primary underline">
                          {ct?.name ?? cat.slug}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <p className="mt-6"><Link href={`/${locale}/collections`} className="text-primary underline">{dict['nav.collections'] ?? 'Collections'}</Link></p>
          </div>
        ) : (
          <div className="mt-8">
            <CategoryProductsClient locale={locale} products={catalogProducts} showFilters />
          </div>
        )}
      </div>
    </CurrencyProvider>
  );
}
