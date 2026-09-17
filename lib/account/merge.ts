import { AccountType } from '@prisma/client';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export async function mergeThinAccountsInto(
  tx: Tx,
  targetUserId: string,
  email?: string | null,
  phone?: string | null,
): Promise<number> {
  const emailLower = email?.toLowerCase();
  if (!emailLower && !phone) return 0;

  const thinAccounts = await tx.user.findMany({
    where: {
      OR: [
        ...(emailLower ? [{ email: emailLower }] : []),
        ...(phone ? [{ phone }] : []),
      ],
      accountType: AccountType.THIN,
      id: { not: targetUserId },
      deletedAt: null,
    },
  });

  for (const thin of thinAccounts) {
    await tx.order.updateMany({ where: { userId: thin.id }, data: { userId: targetUserId } });
    await tx.cartItem.updateMany({ where: { userId: thin.id }, data: { userId: targetUserId } });
    await tx.abandonedCart.updateMany({ where: { userId: thin.id }, data: { userId: targetUserId } });
    await tx.user.update({
      where: { id: thin.id },
      data: { mergedFromUserId: targetUserId, mergedAt: new Date(), deletedAt: new Date() },
    });
  }

  return thinAccounts.length;
}
