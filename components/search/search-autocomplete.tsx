'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Suggestion {
  slug: string;
  name: string;
  price: string;
  imageUrl?: string;
}

export function SearchAutocomplete() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}&locale=${locale}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions ?? []);
          setOpen(true);
        }
      } catch {
        /* aborted */
      }
    },
    [locale],
  );

  const onChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
    }
  };

  return (
    <form onSubmit={submit} className="relative w-full">
      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search products…"
        className="ps-9 h-10"
        aria-label="Search"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-dropdown max-h-80 overflow-auto">
          {suggestions.map((s) => (
            <li key={s.slug}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted text-start"
                onMouseDown={() => {
                  router.push(`/${locale}/products/${s.slug}`);
                  setOpen(false);
                }}
              >
                {s.imageUrl && <img src={s.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />}
                <span className="flex-1">{s.name}</span>
                <span className="text-muted-foreground tabular-nums">{s.price}</span>
              </button>
            </li>
          ))}
          <li className="border-t">
            <button
              type="submit"
              className="w-full px-3 py-2 text-sm text-primary hover:bg-muted text-start"
            >
              View all results for &quot;{query}&quot;
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
