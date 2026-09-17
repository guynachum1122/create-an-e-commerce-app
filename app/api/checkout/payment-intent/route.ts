import { NextResponse } from 'next/server';

/** Legacy endpoint — mock payments use /api/checkout directly */
export async function POST() {
  return NextResponse.json({ error: 'Use POST /api/checkout' }, { status: 410 });
}
