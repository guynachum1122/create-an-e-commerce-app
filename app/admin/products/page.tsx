import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/auth';

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    include: { translations: true, variants: true, category: { include: { translations: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Add product</Link>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b text-start">
            <th className="py-2">Name</th>
            <th>Status</th>
            <th>Stock</th>
            <th>Alerts</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const totalStock = p.variants.reduce((s, v) => s + v.stockQuantity, 0);
            const lowVariants = p.variants.filter((v) => v.stockQuantity <= v.lowStockThreshold);
            const oos = p.variants.filter((v) => v.stockQuantity === 0);
            return (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.translations[0]?.name ?? p.slug}</td>
                <td>{p.status}</td>
                <td>{totalStock}</td>
                <td>
                  {oos.length > 0 && <span className="text-destructive text-xs me-2">{oos.length} OOS</span>}
                  {lowVariants.length > 0 && <span className="text-warning text-xs">{lowVariants.length} low</span>}
                </td>
                <td className="text-end">
                  <Link href={`/admin/products/${p.id}`} className="text-primary underline">Edit</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
