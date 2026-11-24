import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDate } from './business';

type LegalLayoutProps = {
  title: string;
  updated: string;
  intro?: ReactNode;
  children: ReactNode;
};

/** Shared reading layout for the legal pages: comfortable measure, clear heading steps. */
export default function LegalLayout({ title, updated, intro, children }: LegalLayoutProps) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 pt-10 sm:px-6 md:pt-14">
      <a
        href="#/"
        className="mb-8 inline-flex items-center gap-1.5 rounded-full text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
      >
        <ArrowRight aria-hidden="true" className="size-4" />
        חזרה לדף הבית
      </a>

      <header className="mb-10 border-b border-ink-200 pb-8">
        <h1 className="font-display text-4xl font-semibold leading-tight text-ink-900 md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-ink-600">
          עודכן לאחרונה: <time dateTime={updated}>{formatDate(updated)}</time>
        </p>
        {intro && <div className="mt-5 text-lg leading-relaxed text-ink-700">{intro}</div>}
      </header>

      <div className="legal-prose">{children}</div>
    </article>
  );
}

/** A titled section inside a legal page. */
export function Clause({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="mb-10">
      <h2 id={id ? `${id}-title` : undefined} className="mb-3 font-display text-2xl font-semibold text-ink-900">
        {title}
      </h2>
      {children}
    </section>
  );
}
