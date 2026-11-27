import { ArrowLeft } from 'lucide-react';
import { useContent } from '../content/store';
import SmartImage from './SmartImage';

/** The logo's three confetti colours, dealt in turn. */
const DOTS = ['bg-brand-400', 'bg-sun-400', 'bg-lagoon-400'];

export default function Categories() {
  const { categories, themes } = useContent();
  const count = categories.items.length;
  return (
    <>
      {/* Top categories */}
      <section aria-labelledby="top-categories-title" id="top-categories" className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 md:pt-20">
        <h2 id="top-categories-title" className="sr-only">
          קטגוריות מובילות
        </h2>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-3">
          {categories.items.map((cat, idx) => (
            // A lone last card in the 2-column layout spans the row
            <li key={idx} className={idx === count - 1 && count % 2 === 1 ? 'sm:col-span-2 md:col-span-1' : undefined}>
              <a href={cat.href || '#'} className="group block rounded-3xl">
                <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-ink-100 ring-1 ring-ink-900/5">
                  <SmartImage
                    src={cat.image}
                    alt=""
                    seed={idx + 21}
                    width={640}
                    height={480}
                    className="motion-zoom size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                  />
                </div>
                <h3 className="mt-4 flex items-center justify-between gap-3 px-1 font-display text-xl font-bold text-ink-900 transition-colors group-hover:text-brand-700">
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${DOTS[idx % DOTS.length]}`} />
                    {cat.title}
                  </span>
                  <ArrowLeft
                    aria-hidden="true"
                    className="size-5 shrink-0 text-brand-600 opacity-0 transition-[opacity,transform] duration-300 ease-out-expo group-hover:-translate-x-1 group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </h3>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Themes showcase */}
      <section aria-labelledby="themes-title" id="themes" className="mx-auto w-full max-w-7xl px-4 pt-20 sm:px-6 md:pt-28">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="themes-title" className="font-display text-3xl font-bold text-ink-900 md:text-4xl">
              {themes.title}
            </h2>
            {themes.subtitle && <p className="mt-2 text-lg text-ink-600">{themes.subtitle}</p>}
          </div>
          <a
            href={themes.allLink.href || '#'}
            className="inline-flex w-fit items-center gap-1.5 font-semibold text-brand-700 underline decoration-brand-200 decoration-2 underline-offset-[6px] transition-colors hover:decoration-brand-600"
          >
            {themes.allLink.label}
            <ArrowLeft aria-hidden="true" className="size-4" />
          </a>
        </div>

        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {themes.items.map((theme, idx) => (
            <li key={idx}>
              <a
                href={theme.href || '#'}
                className="group relative block aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-ink-100 sm:aspect-[16/10]"
              >
                <SmartImage
                  src={theme.image}
                  alt=""
                  seed={idx + 41}
                  width={800}
                  height={500}
                  className="motion-zoom size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/85 via-ink-950/45 to-transparent p-6 pt-20 text-white md:p-8 md:pt-24">
                  <h3 className="font-display text-2xl font-bold">{theme.title}</h3>
                  <p className="on-dark-muted mt-1 text-white/85">{theme.subtitle}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
