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

export async function GET() {
  try {
    await requireAdmin();
    const products = await prisma.product.findMany({ include: { translations: true, variants: true } });
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    const data = parsed.data;
    const product = await prisma.product.create({
      data: {
        slug: data.slug,
        status: data.status,
        categoryId: data.categoryId,
        translations: {
          create: [
            { locale: 'EN', name: data.nameEn, shortDescription: data.shortDescriptionEn, description: data.descriptionEn, sizeFitGuide: data.sizeFitGuideEn, careInstructions: data.careInstructionsEn, materials: data.materialsEn },
            { locale: 'HE', name: data.nameHe || data.nameEn, shortDescription: data.shortDescriptionHe, description: data.descriptionHe },
          ],
        },
        images: { create: [{ url: data.imageUrl, sortOrder: 0 }] },
        variants: {
          create: data.variants.map((v) => ({
            sku: v.sku,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex ?? null,
            stockQuantity: v.stockQuantity,
            priceEurCents: v.priceEurCents,
            priceGbpCents: v.priceGbpCents,
            salePriceEurCents: parseSale(v.salePriceEurCents),
            salePriceGbpCents: parseSale(v.salePriceGbpCents),
          })),
        },
      },
    });

    return NextResponse.json({ id: product.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
