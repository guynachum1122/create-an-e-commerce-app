import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getDictionary, localeToPrisma, formatPrice, getEffectivePrice } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { config } from '@/lib/config';
import type { AppLocale } from '@/lib/i18n';
import { regionToCurrency } from '@/lib/i18n';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  const dict = getDictionary(locale);
  const prismaLocale = localeToPrisma(locale);
  const currency = regionToCurrency('EU');

  const [collections, categories] = await Promise.all([
    prisma.collection.findMany({
      where: { isFeatured: true, isActive: true },
      orderBy: { sortOrder: 'asc' },
      take: 4,
      include: { translations: true },
    }),
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: { translations: true },
    }),
  ]);

  return (
    <div>
      <section className="relative min-h-[60vh] md:min-h-[70vh] flex items-center bg-brand-charcoal text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1600')] bg-cover bg-center opacity-40" />
        <div className="relative mx-auto max-w-content px-gutter md:px-gutter-lg py-section-y-sm md:py-section-y">
          <h1 className="font-display text-display-lg md:text-display-xl max-w-2xl">{dict['hero.headline']}</h1>
          <p className="mt-4 text-body-lg max-w-xl text-white/90">{dict['hero.subcopy']}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild size="lg"><Link href={`/${locale}/collections`}>{dict['hero.cta.primary']}</Link></Button>
            <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
              <Link href={`/${locale}/category/kitchen`}>{dict['hero.cta.secondary']}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-gutter md:px-gutter-lg py-section-y-sm md:py-section-y">
        <h2 className="font-display text-display-sm mb-6">{dict['homepage.featuredCollections']}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {collections.map((col) => {
            const t = col.translations.find((tr) => tr.locale === prismaLocale) ?? col.translations[0];
            return (
              <Link key={col.id} href={`/${locale}/collections/${col.slug}`} className="group relative aspect-[4/5] rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow">
                {col.heroImageUrl && <img src={col.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 p-6"><h3 className="font-display text-display-sm text-white">{t?.name}</h3></div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-content px-gutter md:px-gutter-lg pb-section-y-sm md:pb-section-y">
        <h2 className="font-display text-display-sm mb-6">{dict['homepage.shopByCategory']}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const t = cat.translations.find((tr) => tr.locale === prismaLocale) ?? cat.translations[0];
            return (
              <Link key={cat.id} href={`/${locale}/category/${cat.slug}`} className="rounded-xl border bg-card p-6 hover:bg-accent transition-colors">
                <h3 className="font-medium">{t?.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t?.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t bg-muted/50">
        <div className="mx-auto max-w-content px-gutter md:px-gutter-lg py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div><p className="font-medium">{dict['trust.shipping']}</p></div>
          <div><p className="font-medium">{dict['trust.tax']}</p></div>
          <div><p className="font-medium">{dict['trust.secure']}</p></div>
        </div>
      </section>
    </div>
  );
}
