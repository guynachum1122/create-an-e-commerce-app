import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { z } from 'zod';

const schema = z.object({ status: z.enum(['APPROVED', 'REJECTED']) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

    await prisma.returnRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
