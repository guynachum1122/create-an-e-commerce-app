import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { z } from 'zod';

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(1),
  size: z.string().min(1),
  color: z.string().min(1),
  colorHex: z.string().optional(),
  stockQuantity: z.number().int().min(0),
  priceEurCents: z.number().int().min(0),
  priceGbpCents: z.number().int().min(0),
  salePriceEurCents: z.union([z.string(), z.number()]).optional(),
  salePriceGbpCents: z.union([z.string(), z.number()]).optional(),
});

const productSchema = z.object({
  slug: z.string().min(1).max(80),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  categoryId: z.string().uuid(),
  nameEn: z.string().min(1),
  nameHe: z.string().optional(),
  shortDescriptionEn: z.string().optional(),
  shortDescriptionHe: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionHe: z.string().optional(),
  sizeFitGuideEn: z.string().optional(),
  careInstructionsEn: z.string().optional(),
  materialsEn: z.string().optional(),
  imageUrl: z.string().url(),
  variants: z.array(variantSchema).min(1),
});

function parseSale(value: string | number | undefined): number | null {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    const data = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { slug: data.slug, status: data.status, categoryId: data.categoryId },
      });

      await tx.productTranslation.upsert({
        where: { productId_locale: { productId: id, locale: 'EN' } },
        create: { productId: id, locale: 'EN', name: data.nameEn, shortDescription: data.shortDescriptionEn, description: data.descriptionEn, sizeFitGuide: data.sizeFitGuideEn, careInstructions: data.careInstructionsEn, materials: data.materialsEn },
        update: { name: data.nameEn, shortDescription: data.shortDescriptionEn, description: data.descriptionEn, sizeFitGuide: data.sizeFitGuideEn, careInstructions: data.careInstructionsEn, materials: data.materialsEn },
      });
      await tx.productTranslation.upsert({
        where: { productId_locale: { productId: id, locale: 'HE' } },
        create: { productId: id, locale: 'HE', name: data.nameHe || data.nameEn, shortDescription: data.shortDescriptionHe, description: data.descriptionHe },
        update: { name: data.nameHe || data.nameEn, shortDescription: data.shortDescriptionHe, description: data.descriptionHe },
      });

      const existingImage = await tx.productImage.findFirst({ where: { productId: id, variantId: null } });
      if (existingImage) {
        await tx.productImage.update({ where: { id: existingImage.id }, data: { url: data.imageUrl } });
      } else {
        await tx.productImage.create({ data: { productId: id, url: data.imageUrl, sortOrder: 0 } });
      }

      for (const v of data.variants) {
        if (v.id) {
          await tx.variant.update({
            where: { id: v.id },
            data: {
              sku: v.sku,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex ?? null,
              stockQuantity: v.stockQuantity,
              priceEurCents: v.priceEurCents,
              priceGbpCents: v.priceGbpCents,
              salePriceEurCents: parseSale(v.salePriceEurCents),
              salePriceGbpCents: parseSale(v.salePriceGbpCents),
            },
          });
        } else {
          await tx.variant.create({
            data: {
              productId: id,
              sku: v.sku,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex ?? null,
              stockQuantity: v.stockQuantity,
              priceEurCents: v.priceEurCents,
              priceGbpCents: v.priceGbpCents,
              salePriceEurCents: parseSale(v.salePriceEurCents),
              salePriceGbpCents: parseSale(v.salePriceGbpCents),
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}
