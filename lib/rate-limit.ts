import { prisma } from '@/lib/db';

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  'auth:login': { max: 5, windowMs: 60_000 },
  'auth:login-ip': { max: 20, windowMs: 60_000 },
  'auth:register': { max: 5, windowMs: 60_000 },
  'auth:forgot-password': { max: 3, windowMs: 300_000 },
  'auth:reset-password': { max: 5, windowMs: 60_000 },
  'auth:verify-email': { max: 5, windowMs: 60_000 },
  'auth:sms': { max: 5, windowMs: 60_000 },
  'auth:sms-ip': { max: 10, windowMs: 60_000 },
  'auth:sms-verify': { max: 5, windowMs: 60_000 },
  'checkout:payment': { max: 10, windowMs: 60_000 },
  'coupons:validate': { max: 10, windowMs: 60_000 },
  'account:export': { max: 3, windowMs: 300_000 },
  'account:delete': { max: 3, windowMs: 300_000 },
};

export async function checkRateLimit(
  keyPrefix: string,
  identifier: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = LIMITS[keyPrefix];
  if (!config) return { allowed: true };

  const key = `${keyPrefix}:${identifier}`;
  const now = new Date();

  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });

  if (!bucket || bucket.expiresAt < now) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now, expiresAt: new Date(now.getTime() + config.windowMs) },
      update: { count: 1, windowStart: now, expiresAt: new Date(now.getTime() + config.windowMs) },
    });
    return { allowed: true };
  }

  if (bucket.count >= config.max) {
    return { allowed: false, retryAfter: Math.ceil((bucket.expiresAt.getTime() - now.getTime()) / 1000) };
  }

  await prisma.rateLimitBucket.update({
    where: { key },
    data: { count: bucket.count + 1 },
  });

  return { allowed: true };
}
