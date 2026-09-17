import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient | typeof prisma;

export async function decrementStock(
  items: { variantId: string; quantity: number }[],
  tx: Tx = prisma,
): Promise<boolean> {
  for (const item of items) {
    const locked = await tx.$queryRaw<{ stockQuantity: number }[]>`
      SELECT "stockQuantity" FROM "Variant" WHERE id = ${item.variantId}::uuid FOR UPDATE
    `;
    const current = locked[0]?.stockQuantity ?? 0;
    if (current < item.quantity) {
      return false;
    }
    await tx.variant.update({
      where: { id: item.variantId },
      data: { stockQuantity: { decrement: item.quantity } },
    });
  }
  return true;
}

export function schemaAvailability(stockQuantity: number): string {
  return stockQuantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
}

export async function restoreStock(
  items: { variantId: string; quantity: number }[],
  tx: Tx = prisma,
): Promise<void> {
  for (const item of items) {
    await tx.variant.update({
      where: { id: item.variantId },
      data: { stockQuantity: { increment: item.quantity } },
    });
  }
}

export async function validateCartStock(
  items: { variantId: string; quantity: number; sku?: string }[],
): Promise<{ ok: true } | { ok: false; sku: string }> {
  for (const item of items) {
    const variant = await prisma.variant.findUnique({
      where: { id: item.variantId },
      select: { stockQuantity: true, sku: true },
    });
    if (!variant || variant.stockQuantity < item.quantity) {
      return { ok: false, sku: item.sku ?? variant?.sku ?? item.variantId };
    }
  }
  return { ok: true };
}
