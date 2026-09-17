import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const [cards, banks] = await Promise.all([
    prisma.fakeCreditCard.findMany({ where: { isActive: true } }),
    prisma.fakeBankAccount.findMany({ where: { isActive: true } }),
  ]);
  return NextResponse.json({ cards, banks });
}
