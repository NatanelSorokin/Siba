import { Check, ChevronLeft, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatPrice } from '../cart';
import { productsIn, stockLeft } from '../catalog';
import CartIcon from '../components/CartIcon';
import SmartImage from '../components/SmartImage';
import { useContent } from '../content/store';
import type { Product } from '../content/types';
import { telHref } from '../legal/business';
import NotFound from './NotFound';

const stepButton =
  'inline-flex size-8 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-30 sm:size-9';

/**
 * One product: picture, name, price, then a quantity selector (bottom right, where
 * an RTL reader's eye ends the price line) and the add-to-cart button (bottom left).
 */
function ProductCard({
  product: p,
  seed,
  lone,
  onAdd,
}: {
  product: Product;
  seed: number;
  /** The odd one out on the last two-column row: centred under the others. */
  lone: boolean;
  onAdd: (product: Product, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const max = stockLeft(p);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(t);
  }, [added]);

  return (
    <li
      className={`flex flex-col ${
        lone ? 'col-span-2 mx-auto w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1.5rem)/2)] lg:col-span-1 lg:mx-0 lg:w-auto' : ''
      }`}
    >
      <div className="aspect-square overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-ink-900/5 sm:rounded-3xl">
        <SmartImage src={p.image} alt="" seed={seed} width={480} height={480} className="size-full object-cover" />
      </div>
      <h2 className="mt-3 line-clamp-2 font-display text-base font-bold leading-snug text-ink-900 sm:mt-4 sm:text-xl">{p.name}</h2>
      {p.description && <p className="mt-1 line-clamp-3 hidden leading-relaxed text-ink-600 sm:block">{p.description}</p>}
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 sm:mt-3">
        <span className="font-display text-xl font-bold text-ink-900 tabular-nums sm:text-2xl">{formatPrice(Number(p.price))}</span>
        {Number(p.oldPrice) > Number(p.price) && (
          <del className="text-sm text-ink-500 tabular-nums sm:text-base">
            <span className="sr-only">במקום </span>
            {formatPrice(Number(p.oldPrice))}
          </del>
        )}
      </p>

      <div className="mt-auto pt-3 sm:pt-4">
        {max > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <div role="group" aria-label={`כמות של ${p.name}`} className="flex items-center rounded-full ring-1 ring-ink-200">
              <button type="button" className={stepButton} onClick={() => setQty((n) => Math.min(max, n + 1))} disabled={qty >= max} aria-label="הוספת יחידה">
                <Plus aria-hidden="true" className="size-4" />
              </button>
              <output aria-live="polite" className="w-6 text-center font-semibold tabular-nums sm:w-8">
                {qty}
              </output>
              <button type="button" className={stepButton} onClick={() => setQty((n) => Math.max(1, n - 1))} disabled={qty <= 1} aria-label="הורדת יחידה">
                <Minus aria-hidden="true" className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onAdd(p, qty);
                setAdded(true);
                setQty(1);
              }}
              aria-label={added ? `${p.name} נוסף לסל` : `הוספת ${p.name} לסל`}
              className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-3 font-semibold text-white transition-colors sm:h-11 sm:px-5 ${
                added ? 'bg-lagoon-600' : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              {added ? <Check aria-hidden="true" className="size-5" /> : <CartIcon aria-hidden="true" className="size-5" />}
              <span aria-hidden="true" className="hidden sm:inline">
                {added ? 'נוסף' : 'לסל'}
              </span>
            </button>
          </div>
        ) : (
          <p className="flex h-10 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-ink-600 sm:h-11">אזל מהמלאי</p>
        )}
      </div>
    </li>
  );
}

/** A category's own page (/category/<id>): its products, each one a click from the cart. */
export default function CategoryPage({ id, onAdd }: { id: string; onAdd: (product: Product, qty: number) => void }) {
  const content = useContent();
  const category = content.catalog.categories.find((c) => c.id === id);

  if (!category) return <NotFound text="הקטגוריה הזו לא קיימת, או שהוסרה." />;
  const products = productsIn(content, id);

  return (
    <section aria-labelledby="category-title" className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 md:pt-12">
      <nav aria-label="פירורי לחם" className="text-sm text-ink-600">
        <ol className="flex items-center gap-1.5">
          <li>
            <a href="/" className="underline-offset-4 hover:text-brand-700 hover:underline">
              דף הבית
            </a>
          </li>
          <li aria-hidden="true">
            <ChevronLeft className="size-4" />
          </li>
          <li aria-current="page" className="font-semibold text-ink-900">
            {category.name}
          </li>
        </ol>
      </nav>

      <h1 id="category-title" className="mt-4 font-display text-4xl font-bold text-ink-900 md:text-5xl">
        {category.name}
      </h1>
      {category.description && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-600">{category.description}</p>}

      {products.length === 0 ? (
        <div className="mt-10 flex flex-col items-start gap-4 rounded-3xl bg-brand-50 p-8 ring-1 ring-brand-100 md:p-10">
          <p className="text-xl font-bold text-ink-900">המוצרים של הקטגוריה הזו עוד לא באתר.</p>
          <p className="max-w-xl text-ink-700">
            בינתיים אפשר לשאול עליהם בטלפון, או לבחור חבילת מסיבה מוכנה.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/#party-in-a-box"
              className="inline-flex h-12 items-center rounded-full bg-brand-600 px-6 font-semibold text-white transition-colors hover:bg-brand-700"
            >
              לחבילות המסיבה
            </a>
            {content.business.phone && (
              <a
                href={`tel:${telHref(content.business.phone)}`}
                className="inline-flex h-12 items-center rounded-full bg-white px-6 font-semibold text-ink-900 ring-1 ring-ink-200 transition-colors hover:bg-ink-50"
              >
                <span className="sr-only">טלפון: </span>
                <span dir="ltr">{content.business.phone}</span>
              </a>
            )}
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:mt-10 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, idx) => (
            <ProductCard key={p.id} product={p} seed={idx + 40} lone={products.length % 2 === 1 && idx === products.length - 1} onAdd={onAdd} />
          ))}
        </ul>
      )}
    </section>
  );
}
