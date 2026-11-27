import { Cake, Check, CheckCircle2, Flame, Package, Wine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useContent } from '../content/store';
import type { Tier } from '../content/types';
import Confetti from './Confetti';
import CartIcon from './CartIcon';

const tabs = [
  { id: 'holiday', label: 'אירוח לחג', icon: Wine },
  { id: 'birthday', label: 'ימי הולדת', icon: Cake },
];

const toneStyles = {
  neutral: {
    name: 'text-ink-700',
    chip: 'bg-ink-100 text-ink-700',
    price: 'text-ink-900',
    check: 'text-brand-600',
    button: 'bg-ink-100 text-ink-900 hover:bg-ink-200',
  },
  brand: {
    name: 'text-brand-700',
    chip: 'bg-brand-100 text-brand-800',
    price: 'text-brand-700',
    check: 'text-brand-600',
    button: 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_10px_22px_-12px_rgb(216_27_106/0.9)]',
  },
  ink: {
    name: 'text-ink-900',
    chip: 'bg-sun-200 text-ink-900',
    price: 'text-ink-900',
    check: 'text-ink-800',
    button: 'bg-ink-900 text-white hover:bg-ink-800',
  },
} as const;

export default function PartyInABox({ onAddToCart }: { onAddToCart: (tier: Tier) => void }) {
  const { packages } = useContent();
  const [activeTheme, setActiveTheme] = useState('holiday');
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleAdd = (tier: Tier) => {
    onAddToCart(tier);
    setJustAdded(tier.id || tier.name);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJustAdded(null), 1800);
  };

  return (
    <section aria-labelledby="packages-title" className="mx-auto w-full max-w-7xl px-4 pt-20 sm:px-6 md:pt-28" id="party-in-a-box">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-brand-50 p-5 ring-1 ring-brand-100 sm:p-8 lg:p-12">
        <Confetti count={70} seed={5} minRadius={2} maxRadius={9} className="confetti-texture absolute inset-0 -z-10 opacity-70" />
        {/* Header & theme switch */}
        <div className="flex flex-col items-start justify-between gap-6 pb-10 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <h2 id="packages-title" className="font-display text-3xl font-bold text-ink-900 md:text-4xl">
                {packages.title}
              </h2>
              {packages.badge && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-400 px-3 py-1 text-sm font-bold text-ink-900">
                <Package aria-hidden="true" className="size-4" />
                {packages.badge}
              </span>
              )}
            </div>
            <p className="mt-3 text-lg leading-relaxed text-ink-600">
              {packages.text}
            </p>
          </div>

          <div role="group" aria-label="סוג האירוע" className="flex shrink-0 items-center gap-1 rounded-full bg-white p-1.5 shadow-[0_4px_14px_-8px_rgb(33_23_42/0.25)] ring-1 ring-ink-100">
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = activeTheme === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveTheme(id)}
                  className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-300 ease-out-expo ${
                    active ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                  }`}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pricing tiers */}
        <ul className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3 md:gap-5 lg:gap-6">
          {packages.tiers.map((tier, idx) => {
            const s = toneStyles[tier.tone] ?? toneStyles.neutral;
            const added = justAdded === (tier.id || tier.name);
            return (
              <li
                key={tier.id || idx}
                className={`relative flex flex-col rounded-3xl bg-white p-6 lg:p-7 ${
                  tier.featured
                    ? 'mt-3 shadow-[0_24px_50px_-24px_rgb(216_27_106/0.45)] ring-2 ring-brand-600 md:mt-0 md:-translate-y-3'
                    : 'shadow-[0_8px_24px_-16px_rgb(33_23_42/0.25)] ring-1 ring-ink-100'
                }`}
              >
                {tier.featured && (
                  <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-brand-600 px-4 py-1 text-xs font-bold text-white shadow-sm">
                    <Flame aria-hidden="true" className="size-3.5 text-sun-300" />
                    {packages.featuredLabel}
                  </span>
                )}

                <div className="mb-5 flex items-center justify-between gap-3">
                  <h3 className={`text-lg font-bold ${s.name}`}>{tier.name}</h3>
                  <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${s.chip}`}>{tier.guests}</span>
                </div>

                <p className="mb-6 flex items-baseline gap-2.5">
                  <span className={`font-display text-5xl font-bold leading-none tabular-nums ${s.price}`}>
                    <span className="sr-only">מחיר: </span>₪{tier.price}
                  </span>
                  {tier.oldPrice && (
                    <s className="text-base text-ink-500 tabular-nums">
                      <span className="sr-only">במקום </span>₪{tier.oldPrice}
                    </s>
                  )}
                </p>

                <ul className="flex flex-1 flex-col gap-3 text-[0.9375rem] leading-snug text-ink-700">
                  {tier.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 aria-hidden="true" className={`mt-px size-5 shrink-0 ${s.check}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 border-t border-ink-100 pt-6">
                  <button
                    type="button"
                    onClick={() => handleAdd(tier)}
                    className={`flex h-12 w-full items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,transform] duration-200 active:scale-[0.98] ${
                      added ? 'bg-lagoon-700 text-white hover:bg-lagoon-700' : s.button
                    }`}
                  >
                    {added ? (
                      <>
                        <Check aria-hidden="true" className="size-5" />
                        נוסף לסל
                      </>
                    ) : (
                      <>
                        <CartIcon aria-hidden="true" className="size-5" />
                        {tier.cta}
                      </>
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Price disclosure (Consumer Protection Law: total price incl. VAT; real pre-sale price) */}
        <p className="mt-8 text-center text-sm text-ink-600">
          המחירים כוללים מע"מ. המחיר המחוק הוא מחיר החבילה לפני ההנחה. עלויות המשלוח מפורטות ב
          <a href="/shipping" className="font-medium text-brand-700 underline underline-offset-4">
            מדיניות המשלוחים
          </a>
          .
        </p>
      </div>
    </section>
  );
}
