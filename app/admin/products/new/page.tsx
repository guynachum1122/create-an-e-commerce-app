import { prisma } from '@/lib/db';
import { requireAdmin } from '@/auth';
import { ProductForm } from '@/components/admin/product-form';

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    include: { translations: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Add product</h1>
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.translations[0]?.name ?? c.slug }))} />
    </div>
  );
}
