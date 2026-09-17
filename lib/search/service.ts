import { prisma } from '@/lib/db';
import { formatPrice, getEffectivePrice, localeToPrisma } from '@/lib/i18n';
import type { AppLocale } from '@/lib/i18n';
import type { Currency } from '@prisma/client';

const MAX_QUERY_LENGTH = 200;

export async function searchProductIds(query: string, limit = 48): Promise<string[]> {
  const q = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (!q) return [];

  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT p.id
      FROM "Product" p
      LEFT JOIN "ProductTranslation" pt ON pt."productId" = p.id
      LEFT JOIN "Variant" v ON v."productId" = p.id AND v."isActive" = true
      WHERE p.status = 'ACTIVE'
        AND (
          to_tsvector('english',
            coalesce(pt.name, '') || ' ' ||
            coalesce(pt."shortDescription", '') || ' ' ||
            coalesce(pt.description, '') || ' ' ||
            coalesce(pt.materials, '') || ' ' ||
            coalesce(v.sku, '') || ' ' ||
            coalesce(v.size, '') || ' ' ||
            coalesce(v.color, '')
          ) @@ plainto_tsquery('english', ${q})
          OR to_tsvector('simple',
            coalesce(v.sku, '') || ' ' ||
            coalesce(v.size, '') || ' ' ||
            coalesce(v.color, '')
          ) @@ plainto_tsquery('simple', ${q})
          OR lower(pt.name) LIKE ${'%' + q.toLowerCase() + '%'}
          OR lower(v.sku) LIKE ${'%' + q.toLowerCase() + '%'}
        )
      LIMIT ${limit}
    `;
    return rows.map((r) => r.id);
  } catch {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { translations: { some: { name: { contains: q, mode: 'insensitive' } } } },
          { translations: { some: { description: { contains: q, mode: 'insensitive' } } } },
          { variants: { some: { OR: [
            { sku: { contains: q, mode: 'insensitive' } },
            { size: { contains: q, mode: 'insensitive' } },
            { color: { contains: q, mode: 'insensitive' } },
          ] } } },
        ],
      },
      select: { id: true },
      take: limit,
    });
    return products.map((p) => p.id);
  }
}

export async function searchProducts(
  query: string,
  locale: AppLocale,
  currency: Currency = 'EUR',
  limit = 20,
) {
  const prismaLocale = localeToPrisma(locale);
  const ids = await searchProductIds(query, limit);
  if (!ids.length) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: {
      translations: true,
      variants: { where: { isActive: true }, take: 1 },
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
  });

  const orderMap = new Map(ids.map((id, i) => [id, i]));
  products.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return products.map((p) => {
    const t = p.translations.find((tr) => tr.locale === prismaLocale) ?? p.translations[0];
    const v = p.variants[0];
    const price = v ? getEffectivePrice(v, currency).price : 0;
    return {
      id: p.id,
      slug: p.slug,
      name: t?.name ?? p.slug,
      price: formatPrice(price, currency),
      priceCents: price,
      imageUrl: p.images[0]?.url,
      averageRating: p.averageRating ? Number(p.averageRating) : 0,
      reviewCount: p.reviewCount,
      inStock: (v?.stockQuantity ?? 0) > 0,
      onSale: v ? getEffectivePrice(v, currency).onSale : false,
      regularPriceCents: v ? getEffectivePrice(v, currency).regular : 0,
    };
  });
}

export async function getSuggestions(query: string, locale: AppLocale, currency: Currency = 'EUR', limit = 8) {
  return searchProducts(query, locale, currency, limit);
}
