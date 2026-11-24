import { Heart, PhoneCall, Search, ShoppingCart, X } from 'lucide-react';
import { type FocusEvent, type PointerEvent, type Ref, useEffect, useRef, useState } from 'react';
import Logo from './Logo';

const categories = [
  'בלונים',
  'יום הולדת לפי נושא',
  'מוצרי מסיבה',
  'אביזרי אפייה',
  'חומרי גלם לאפייה',
  'קישוטים לעוגה',
  'כלים חד פעמיים',
  'כלים מתכלים',
  'ממתקים',
];

const iconButton =
  'relative inline-flex size-12 items-center justify-center rounded-full text-ink-700 transition-[background-color,color,transform] duration-200 hover:bg-brand-50 hover:text-brand-700 active:scale-95';

function SearchField({ id, inputRef }: { id: string; inputRef?: Ref<HTMLInputElement> }) {
  return (
    <form role="search" className="relative w-full">
      <label htmlFor={id} className="sr-only">
        חיפוש מוצרים
      </label>
      <input
        ref={inputRef}
        id={id}
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="מה מחפשים?"
        className="h-12 w-full rounded-full border border-ink-200 bg-ink-50 ps-12 pe-5 text-base text-ink-900 transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-ink-500 hover:border-ink-300 focus:border-brand-400 focus:bg-white focus:shadow-[0_0_0_4px_var(--color-brand-100)] focus:outline-none"
      />
      <Search aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink-500" />
    </form>
  );
}

export default function Header({ cartCount }: { cartCount: number }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // When collapsed, hovering (or keyboard-focusing) the header brings back the full version.
  const [hovered, setHovered] = useState(false);
  const [keyboardInside, setKeyboardInside] = useState(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  const collapsed = isScrolled && !hovered && !keyboardInside;

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return; // touch has no hover; tapping shouldn't reflow the header
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(true), 120);
  };
  const onPointerLeave = () => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(false), 220);
  };
  const onFocus = (e: FocusEvent) => {
    if ((e.target as Element).matches(':focus-visible')) setKeyboardInside(true);
  };
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeyboardInside(false);
  };

  useEffect(() => {
    // Hysteresis: collapse past 56px, expand again only near the top, so the
    // header never flickers when the scroll position hovers at the threshold.
    const onScroll = () => {
      const y = window.scrollY;
      setIsScrolled((prev) => (prev ? y > 8 : y > 56));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    mobileSearchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSearchOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  return (
    <header
      data-scrolled={isScrolled}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      className="fixed inset-x-0 top-0 z-50 border-b border-ink-100 bg-white/95 backdrop-blur-md transition-shadow duration-300 data-[scrolled=true]:shadow-[0_10px_30px_-18px_rgb(33_23_42/0.35)] supports-[backdrop-filter]:bg-white/85"
    >
      {/* Utility bar — collapses on scroll */}
      <div
        inert={collapsed}
        className={`overflow-hidden bg-ink-50 text-ink-600 transition-[height,opacity] duration-300 ease-out-expo ${
          collapsed ? 'h-0 opacity-0' : 'h-9 opacity-100'
        }`}
      >
        <div className="mx-auto flex h-9 max-w-[1600px] items-center justify-between gap-4 px-4 text-[0.8125rem] sm:px-6">
          <a
            href="tel:+97235551234"
            className="flex items-center gap-1.5 font-semibold text-ink-900 transition-colors hover:text-brand-700"
          >
            <PhoneCall aria-hidden="true" className="size-3.5 text-brand-600" />
            <span className="sr-only">טלפון:</span>
            <span dir="ltr">03-5551234</span>
          </a>
        </div>
      </div>

      {/* Main row: search (start) · logo (centre) · wishlist + cart (end) */}
      <div
        className={`mx-auto grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 transition-[height] duration-500 ease-out-expo sm:px-6 ${
          collapsed ? 'h-16 lg:h-[4.5rem]' : 'h-[5.5rem] md:h-36 lg:h-40'
        }`}
      >
        <div className="flex items-center justify-start">
          <div className="hidden w-full max-w-md lg:block">
            <SearchField id="site-search" />
          </div>
          <button
            type="button"
            className={`${iconButton} lg:hidden`}
            aria-label={searchOpen ? 'סגירת החיפוש' : 'חיפוש'}
            aria-expanded={searchOpen}
            aria-controls="mobile-search"
            onClick={() => setSearchOpen((open) => !open)}
          >
            {searchOpen ? <X aria-hidden="true" className="size-6" /> : <Search aria-hidden="true" className="size-6" />}
          </button>
        </div>

        <a href="#/" className="block rounded-full" aria-label="סיבה למסיבה – לדף הבית">
          <Logo
            eager
            alt=""
            compact={collapsed}
            className={`transition-[width,height] duration-500 ease-out-expo ${
              collapsed ? 'size-12 lg:size-14' : 'size-[4.5rem] md:size-28 lg:size-36'
            }`}
          />
        </a>

        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <a href="#" className={iconButton} aria-label="רשימת המשאלות">
            <Heart aria-hidden="true" className="size-6" />
          </a>
          <a href="#" className={iconButton} aria-label={`סל הקניות, ${cartCount} פריטים`}>
            <ShoppingCart aria-hidden="true" className="size-6" />
            <span
              key={cartCount}
              aria-hidden="true"
              className="badge-bump absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-brand-600 px-1 text-xs font-bold leading-none text-white tabular-nums"
            >
              {cartCount}
            </span>
          </a>
        </div>
      </div>

      {/* Mobile search drawer */}
      <div
        id="mobile-search"
        hidden={!searchOpen}
        className="absolute inset-x-0 top-full border-b border-ink-100 bg-white px-4 py-3 shadow-[0_12px_24px_-16px_rgb(33_23_42/0.4)] lg:hidden"
      >
        <SearchField id="mobile-site-search" inputRef={mobileSearchRef} />
      </div>

      {/* Category navigation */}
      <nav aria-label="קטגוריות" className="border-t border-ink-100">
        <div className="nav-fade scrollbar-hide mx-auto max-w-[1600px] overflow-x-auto px-2 sm:px-4">
          <ul className="flex h-12 w-max min-w-full items-center justify-start gap-0.5 lg:justify-center lg:gap-2">
            {categories.map((name) => (
              <li key={name}>
                <a
                  href="#"
                  className="block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
