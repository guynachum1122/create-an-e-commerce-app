import { config } from '@/lib/config';
import { schemaAvailability } from '@/lib/stock';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${config.siteUrl}/#organization`,
        name: config.storeName,
        url: config.siteUrl,
        logo: `${config.siteUrl}/logo.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${config.siteUrl}/#website`,
        url: config.siteUrl,
        name: config.storeName,
        publisher: { '@id': `${config.siteUrl}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${config.siteUrl}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

export function productSchema(product: {
  name: string;
  slug: string;
  description: string;
  averageRating: number;
  reviewCount: number;
  images: { url: string }[];
  variants: { sku: string; priceCents: number; stockQuantity: number }[];
  category?: { name: string; slug: string };
  reviews?: Array<{ rating: number; body: string; createdAt: Date; user: { name: string | null } }>;
}) {
  const url = `${config.siteUrl}/products/${product.slug}`;
  const prices = product.variants.map((v) => v.priceCents);
  const inStock = product.variants.some((v) => v.stockQuantity > 0);

  const breadcrumbs = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: config.siteUrl },
  ];
  if (product.category) {
    breadcrumbs.push({
      '@type': 'ListItem',
      position: 2,
      name: product.category.name,
      item: `${config.siteUrl}/category/${product.category.slug}`,
    });
  }
  breadcrumbs.push({
    '@type': 'ListItem',
    position: breadcrumbs.length + 1,
    name: product.name,
    item: url,
  });

  const graph: Record<string, unknown>[] = [
    { '@type': 'BreadcrumbList', itemListElement: breadcrumbs },
    {
      '@type': 'Product',
      '@id': `${url}#product`,
      name: product.name,
      description: product.description.slice(0, 500),
      image: product.images.map((i) =>
        i.url.startsWith('http') ? i.url : `${config.siteUrl}${i.url}`
      ),
      sku: product.variants[0]?.sku,
      brand: { '@type': 'Brand', name: config.storeName },
      url,
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: (Math.min(...prices) / 100).toFixed(2),
        highPrice: (Math.max(...prices) / 100).toFixed(2),
        priceCurrency: 'USD',
        offerCount: product.variants.length,
        availability: schemaAvailability(inStock ? 1 : 0),
        url,
      },
    },
  ];

  if (product.reviewCount > 0) {
    (graph[1] as Record<string, unknown>).aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.averageRating).toFixed(1),
      reviewCount: product.reviewCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  if (product.reviews?.length) {
    (graph[1] as Record<string, unknown>).review = product.reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.user.name || 'Customer' },
      datePublished: r.createdAt.toISOString(),
      reviewRating: { '@type': 'Rating', ratingValue: r.rating },
      reviewBody: r.body.slice(0, 500),
    }));
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export function categorySchema(
  category: { name: string; slug: string; description?: string | null },
  products: { slug: string }[]
) {
  const url = `${config.siteUrl}/category/${category.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: config.siteUrl },
          { '@type': 'ListItem', position: 2, name: category.name, item: url },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        name: category.name,
        description: category.description,
        url,
        isPartOf: { '@id': `${config.siteUrl}/#website` },
      },
      {
        '@type': 'ItemList',
        numberOfItems: products.length,
        itemListElement: products.slice(0, 20).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${config.siteUrl}/products/${p.slug}`,
        })),
      },
    ],
  };
}
