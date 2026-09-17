'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { PROJECT_DOCS, PROJECT_DOCS_META } from '@/lib/project-docs';
import { cn } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

export default function DocsPage() {
  const [activeId, setActiveId] = useState(PROJECT_DOCS[0]?.id ?? 'overview');
  const activeSection = PROJECT_DOCS.find((s) => s.id === activeId) ?? PROJECT_DOCS[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 border-b pb-6">
        <div className="flex items-center gap-2 text-brand-600">
          <BookOpen className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">AI Blueprint</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-50">Project Documentation</h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-500">
          <div>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Original prompt:</span>{' '}
            {PROJECT_DOCS_META.prompt}
          </div>
          <div>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Domain:</span>{' '}
            {PROJECT_DOCS_META.domain}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-64 shrink-0">
          <nav className="sticky top-20 space-y-1">
            {PROJECT_DOCS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveId(section.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  activeId === section.id
                    ? 'bg-brand-50 text-brand-700 font-medium dark:bg-brand-900/30 dark:text-teal-300'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                )}
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 flex-1 prose prose-neutral dark:prose-invert max-w-none prose-pre:bg-neutral-900 prose-headings:text-neutral-900 dark:prose-headings:text-neutral-50">
          {activeSection && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {activeSection.content}
            </ReactMarkdown>
          )}
        </article>
      </div>
    </div>
  );
}
