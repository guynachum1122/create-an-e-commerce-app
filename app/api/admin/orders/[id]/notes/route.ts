import { NextResponse } from 'next/server';
import { requireStaff } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { z } from 'zod';

const noteSchema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    const session = await requireStaff();
    const { id: orderId } = await params;
    const body = await request.json();
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid note' }, { status: 400 });

    await prisma.orderInternalNote.create({
      data: { orderId, authorUserId: session.user.id, body: parsed.data.body },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
