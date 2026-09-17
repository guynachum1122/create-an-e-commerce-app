import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { wishlistPostSchema, wishlistDeleteSchema } from '@/lib/validations';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    include: { product: { include: { translations: true, images: { take: 1 } } } },
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const body = await request.json();
  const parsed = wishlistPostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { productId, variantId } = parsed.data;
  const variantKey = variantId ?? null;

  const existing = await prisma.wishlistItem.findFirst({
    where: { userId: session.user.id, productId, variantId: variantKey },
  });

  if (existing) {
    return NextResponse.json({ ok: true });
  }

  await prisma.wishlistItem.create({
    data: { userId: session.user.id, productId, variantId: variantKey ?? undefined },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const body = await request.json();
  const parsed = wishlistDeleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  await prisma.wishlistItem.deleteMany({ where: { id: parsed.data.itemId, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
