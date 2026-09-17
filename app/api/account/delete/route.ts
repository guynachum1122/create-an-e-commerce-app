import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { csrfGuard } from '@/lib/security/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { accountDeleteSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rate = await checkRateLimit('account:delete', session.user.id);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = accountDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Type DELETE to confirm' }, { status: 400 });
    }

    const userId = session.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user?.passwordHash) {
      if (!parsed.data.password) {
        return NextResponse.json({ error: 'Password required' }, { status: 400 });
      }
      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.dataDeletionRequest.create({ data: { userId, status: 'PROCESSING' } });

      await tx.review.deleteMany({ where: { userId } });
      await tx.returnRequest.updateMany({
        where: { userId },
        data: { reason: '[redacted]', adminNotes: '[redacted]' },
      });
      await tx.orderInternalNote.updateMany({
        where: { order: { userId } },
        data: { body: '[redacted]' },
      });
      await tx.abandonedCart.updateMany({
        where: { userId },
        data: { cartSnapshot: {}, email: null },
      });
      await tx.cookieConsent.deleteMany({ where: { userId } });

      await tx.orderShippingAddress.updateMany({
        where: { order: { userId } },
        data: { firstName: 'Deleted', lastName: 'User', line1: 'Redacted', city: 'Redacted', postalCode: '00000', phone: '000' },
      });
      await tx.orderCustomerContact.updateMany({
        where: { order: { userId } },
        data: { name: 'Deleted User', email: 'deleted@anon.local', phone: '000' },
      });

      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.wishlistItem.deleteMany({ where: { userId } });
      await tx.savedPaymentMethod.deleteMany({ where: { userId } });
      await tx.cartItem.deleteMany({ where: { userId } });
      await tx.address.deleteMany({ where: { userId } });

      await tx.user.update({
        where: { id: userId },
        data: { name: 'Deleted User', email: null, phone: null, passwordHash: null, deletedAt: new Date() },
      });

      await tx.dataDeletionRequest.updateMany({
        where: { userId, status: 'PROCESSING' },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.delete('authjs.session-token');
    response.cookies.delete('__Secure-authjs.session-token');
    return response;
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 });
  }
}
