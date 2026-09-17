import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { returnRequestSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = returnRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const order = await prisma.order.findFirst({
      where: { id: parsed.data.orderId, userId: session.user.id, status: 'DELIVERED' },
    });
    if (!order) return NextResponse.json({ error: 'Order not eligible' }, { status: 400 });

    const existing = await prisma.returnRequest.findFirst({
      where: {
        orderId: parsed.data.orderId,
        userId: session.user.id,
        orderItemId: parsed.data.orderItemId ?? null,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Return request already submitted' }, { status: 409 });
    }

    await prisma.returnRequest.create({
      data: {
        orderId: parsed.data.orderId,
        userId: session.user.id,
        orderItemId: parsed.data.orderItemId ?? undefined,
        reason: parsed.data.reason,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
