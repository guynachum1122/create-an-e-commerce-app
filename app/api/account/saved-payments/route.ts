import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { z } from 'zod';

const deleteSchema = z.object({ id: z.string().uuid() });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  if (session.user.accountType !== 'FULL') {
    return NextResponse.json({ methods: [] });
  }

  const methods = await prisma.savedPaymentMethod.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    methods: methods.map((m) => ({
      id: m.id,
      type: m.type,
      label: m.label,
      fakeCardId: m.fakeCardId,
      fakeBankAccountId: m.fakeBankAccountId,
    })),
  });
}

export async function DELETE(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const method = await prisma.savedPaymentMethod.findFirst({
    where: { id: parsed.data.id, userId: session.user.id },
  });
  if (!method) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.savedPaymentMethod.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
