import Link from 'next/link';
import { prisma } from '@/lib/db';
import { localeToPrisma } from '@/lib/i18n';
import type { AppLocale } from '@/lib/i18n';

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  const prismaLocale = localeToPrisma(locale);

  const collections = await prisma.collection.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { translations: true },
  });

  return (
    <div className="mx-auto max-w-content px-gutter md:px-gutter-lg py-8">
      <h1 className="font-display text-display-md">{locale === 'he' ? 'קולקציות' : 'Collections'}</h1>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((col) => {
          const t = col.translations.find((tr) => tr.locale === prismaLocale) ?? col.translations[0];
          return (
            <Link key={col.id} href={`/${locale}/collections/${col.slug}`} className="rounded-2xl border overflow-hidden hover:shadow-card-hover transition-shadow">
              {col.heroImageUrl && <img src={col.heroImageUrl} alt="" className="aspect-video w-full object-cover" />}
              <div className="p-6"><h2 className="font-display text-display-sm">{t?.name}</h2><p className="mt-2 text-sm text-muted-foreground">{t?.description}</p></div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
