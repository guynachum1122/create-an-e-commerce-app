import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { localeToPrisma, getEffectivePrice, formatPrice, countryToRegion, regionToCurrency } from '@/lib/i18n';
import type { AppLocale } from '@/lib/i18n';
import { ProductDetailClient } from '@/components/product/product-detail-client';
import { ReviewSection } from '@/components/product/review-section';
import { JsonLd } from '@/components/seo/structured-data';

async function getCurrencyFromCookies(): Promise<'EUR' | 'GBP'> {
  const cookieStore = await cookies();
  const country = cookieStore.get('kitchen_me_region_country')?.value ?? 'NL';
  return regionToCurrency(countryToRegion(country));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const currency = await getCurrencyFromCookies();
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { translations: true, variants: { where: { isActive: true }, take: 1 } },
  });
  if (!product) return {};
  const t = product.translations.find((tr) => tr.locale === localeToPrisma(locale as AppLocale)) ?? product.translations[0];
  const v = product.variants[0];
  const price = v ? getEffectivePrice(v, currency).price : 0;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kitchen-me.com';
  return {
    title: `${t?.name} | Kitchen-me`,
    description: `${t?.shortDescription ?? t?.name} — ${formatPrice(price, currency)} (tax included).`,
    openGraph: {
      title: t?.name,
      description: t?.shortDescription ?? undefined,
      type: 'website',
      locale: locale === 'he' ? 'he_IL' : 'en_GB',
      url: `${siteUrl}/${locale}/products/${slug}`,
    },
    twitter: { card: 'summary_large_image', title: t?.name, description: t?.shortDescription ?? undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as AppLocale;
  const prismaLocale = localeToPrisma(locale);
  const session = await auth();

  const product = await prisma.product.findUnique({
    where: { slug, status: 'ACTIVE' },
    include: {
      translations: true,
      category: { include: { translations: true, parent: { include: { translations: true } } } },
      variants: { where: { isActive: true }, orderBy: { sku: 'asc' } },
      images: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!product) notFound();

  const translation = product.translations.find((t) => t.locale === prismaLocale) ?? product.translations[0];
  const defaultVariant = product.variants[0];
  const currency = await getCurrencyFromCookies();
  const pricing = defaultVariant ? getEffectivePrice(defaultVariant, currency) : null;

  let canRate = false;
  let eligibleOrderId: string | undefined;
  let eligibleOrderItemId: string | undefined;
  if (session?.user?.id) {
    const deliveredOrder = await prisma.order.findFirst({
      where: {
        userId: session.user.id,
        status: 'DELIVERED',
        items: { some: { productId: product.id } },
      },
      include: { items: { where: { productId: product.id }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    if (deliveredOrder?.items[0]) {
      canRate = true;
      eligibleOrderId = deliveredOrder.id;
      eligibleOrderItemId = deliveredOrder.items[0].id;
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kitchen-me.com';
  const breadcrumbItems = [
    { name: 'Home', item: `${siteUrl}/${locale}` },
    ...(product.category.parent ? [{ name: product.category.parent.translations[0]?.name ?? product.category.parent.slug, item: `${siteUrl}/${locale}/category/${product.category.parent.slug}` }] : []),
    { name: product.category.translations[0]?.name ?? product.category.slug, item: `${siteUrl}/${locale}/category/${product.category.slug}` },
    { name: translation?.name ?? product.slug, item: `${siteUrl}/${locale}/products/${product.slug}` },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: b.item,
        })),
      },
      {
        '@type': 'Product',
        name: translation?.name,
        description: translation?.description,
        sku: defaultVariant?.sku,
        brand: { '@type': 'Brand', name: 'Kitchen-me' },
        image: product.images.map((i) => i.url),
        offers: defaultVariant && pricing ? {
          '@type': 'Offer',
          priceCurrency: currency,
          price: (pricing.price / 100).toFixed(2),
          availability: defaultVariant.stockQuantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        } : undefined,
        ...(product.reviewCount > 0 ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(product.averageRating),
            reviewCount: String(product.reviewCount),
          },
        } : {}),
      },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProductDetailClient
        locale={locale}
        product={{
          id: product.id,
          slug: product.slug,
          name: translation?.name ?? product.slug,
          description: translation?.description ?? '',
          sizeFitGuide: translation?.sizeFitGuide ?? '',
          careInstructions: translation?.careInstructions ?? '',
          materials: translation?.materials ?? '',
          averageRating: product.averageRating ? Number(product.averageRating) : 0,
          reviewCount: product.reviewCount,
          images: product.images,
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            stockQuantity: v.stockQuantity,
            priceEurCents: v.priceEurCents,
            priceGbpCents: v.priceGbpCents,
            salePriceEurCents: v.salePriceEurCents,
            salePriceGbpCents: v.salePriceGbpCents,
          })),
        }}
      />
      <div className="mx-auto max-w-content px-gutter md:px-gutter-lg pb-12">
        <ReviewSection
          locale={locale}
          productId={product.id}
          averageRating={product.averageRating ? Number(product.averageRating) : 0}
          reviewCount={product.reviewCount}
          canRate={canRate}
          eligibleOrderId={eligibleOrderId}
          eligibleOrderItemId={eligibleOrderItemId}
        />
      </div>
    </>
  );
}
