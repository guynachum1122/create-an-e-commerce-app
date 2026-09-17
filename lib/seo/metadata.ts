import type { Metadata } from 'next';
import { config } from '@/lib/config';
import { formatPrice } from '@/lib/i18n';

export function buildTitle(pageTitle: string): string {
  const full = `${pageTitle} | ${config.storeName}`;
  return full.length <= 70 ? full : `${pageTitle.slice(0, 50)}… | ${config.storeName}`;
}

export function buildDescription(text: string, maxLen = 160): string {
  const cleaned = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen - 1).replace(/\s+\S*$/, '') + '…';
}

export function buildCanonical(path: string): string {
  const base = config.siteUrl.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function buildProductMetadata(product: {
  name: string;
  slug: string;
  description: string;
  images: { url: string }[];
  variants: { priceEurCents: number; stockQuantity: number }[];
}, locale = 'en'): Metadata {
  const defaultVariant = product.variants[0];
  const inStock = product.variants.some((v) => v.stockQuantity > 0);
  const description = buildDescription(
    `${product.name}. ${product.description.slice(0, 140)} ${defaultVariant ? formatPrice(defaultVariant.priceEurCents, 'EUR') + '.' : ''} ${inStock ? 'In stock.' : 'Out of stock.'}`,
  );
  const image = product.images[0]?.url;
  const canonical = buildCanonical(`/${locale}/products/${product.slug}`);

  return {
    title: buildTitle(product.name),
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: product.name,
      description,
      url: canonical,
      siteName: config.storeName,
      images: image ? [{ url: image.startsWith('http') ? image : `${config.siteUrl}${image}` }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      images: image ? [image.startsWith('http') ? image : `${config.siteUrl}${image}`] : [],
    },
  };
}

export function buildCategoryMetadata(
  category: { name: string; slug: string; description?: string | null },
  productCount: number,
  locale = 'en',
): Metadata {
  const description = buildDescription(
    category.description ||
      `Shop ${category.name} at ${config.storeName}. Browse ${productCount}+ products with filters for price, rating, and more.`,
  );
  const canonical = buildCanonical(`/${locale}/category/${category.slug}`);

  return {
    title: buildTitle(category.name),
    description,
    alternates: { canonical },
    openGraph: { title: `${category.name} — ${config.storeName}`, description, url: canonical, siteName: config.storeName },
  };
}

export function buildSearchMetadata(query: string, resultCount: number, locale = 'en'): Metadata {
  const description =
    resultCount > 0
      ? `${resultCount} results for "${query}". Find products at ${config.storeName}.`
      : `No results for "${query}". Browse categories or popular products.`;

  return {
    title: buildTitle(`Search results for "${query}"`),
    description,
    alternates: { canonical: buildCanonical(`/${locale}/search?q=${encodeURIComponent(query)}`) },
  };
}

export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false },
};
