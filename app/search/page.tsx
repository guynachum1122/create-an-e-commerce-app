import { redirect } from 'next/navigation';
export default async function P({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  redirect(q ? `/en/search?q=${encodeURIComponent(q)}` : '/en/search');
}
