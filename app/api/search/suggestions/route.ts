import { NextResponse } from 'next/server';
import { getSuggestions } from '@/lib/search/service';
import type { AppLocale } from '@/lib/i18n';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const locale = (searchParams.get('locale') ?? 'en') as AppLocale;
  const suggestions = await getSuggestions(q, locale);
  return NextResponse.json({ suggestions });
}
