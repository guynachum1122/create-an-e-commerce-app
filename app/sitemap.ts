import { MetadataRoute } from 'next';
import { config } from '@/lib/config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config.siteUrl;
  const locales = config.locales;
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push({ url: `${base}/${locale}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 });
    entries.push({ url: `${base}/${locale}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 });
    entries.push({ url: `${base}/${locale}/collections`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 });
  }

  try {
    const { prisma } = await import('@/lib/db');
    const [products, categories, collections] = await Promise.all([
      prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      prisma.collection.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    ]);

    for (const locale of locales) {
      for (const p of products) {
        entries.push({ url: `${base}/${locale}/products/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'weekly', priority: 0.9 });
      }
      for (const c of categories) {
        entries.push({ url: `${base}/${locale}/category/${c.slug}`, lastModified: c.updatedAt, changeFrequency: 'weekly', priority: 0.8 });
      }
      for (const c of collections) {
        entries.push({ url: `${base}/${locale}/collections/${c.slug}`, lastModified: c.updatedAt, changeFrequency: 'weekly', priority: 0.8 });
      }
    }
  } catch {
    // DB unavailable at build time — static entries only
  }

  return entries;
}
