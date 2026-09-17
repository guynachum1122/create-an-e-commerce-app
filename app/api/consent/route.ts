import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { csrfGuard } from '@/lib/security/csrf';
import { consentSchema } from '@/lib/validations';
import { CONSENT_COOKIE, serializeConsent } from '@/lib/consent';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = consentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid consent data' }, { status: 400 });
    }

    const session = await auth();
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('guest_cart_id')?.value;
    const consentedAt = new Date();

    await prisma.cookieConsent.create({
      data: {
        userId: session?.user?.id,
        sessionId: session?.user?.id ? undefined : sessionId,
        essential: true,
        analytics: parsed.data.analytics,
        marketing: parsed.data.marketing,
        consentedAt,
      },
    });

    const consentState = {
      essential: true,
      analytics: parsed.data.analytics,
      marketing: parsed.data.marketing,
      consentedAt: consentedAt.toISOString(),
    };

    const response = NextResponse.json({ ok: true });
    response.cookies.set(CONSENT_COOKIE, serializeConsent(consentState), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to save consent' }, { status: 500 });
  }
}
