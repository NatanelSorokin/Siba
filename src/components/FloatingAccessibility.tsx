import {
  AArrowDown,
  AArrowUp,
  Accessibility,
  Blend,
  Check,
  CircleDot,
  Contrast,
  Droplet,
  Eye,
  FileText,
  Hand,
  Heading,
  Keyboard,
  Link2,
  type LucideIcon,
  Mail,
  MessageSquareText,
  Minus,
  MousePointer,
  MousePointer2,
  PaintBucket,
  PanelBottom,
  Plus,
  RotateCcw,
  Type,
  X,
  ZoomIn,
} from 'lucide-react';
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  type A11yPrefs,
  type ColorMode,
  type CursorMode,
  DEFAULT_PREFS,
  type DescribeMode,
  FONT_RANGE,
  ZOOM_RANGE,
  applyPrefs,
  fontScale,
  isDefault,
  loadPrefs,
  savePrefs,
  zoomScale,
} from '../a11y';

/* ------------------------------------------------------------------ */
/* Tool definitions                                                    */
/* ------------------------------------------------------------------ */

type Tool = {
  id: string;
  label: string;
  icon: LucideIcon;
  on: (p: A11yPrefs) => boolean;
  apply: (p: A11yPrefs) => A11yPrefs;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const percent = (n: number) => `${Math.round(n * 100)}%`;

const toggle = (key: 'keyboard' | 'noMotion' | 'headings' | 'links' | 'readable') => ({
  on: (p: A11yPrefs) => p[key],
  apply: (p: A11yPrefs) => ({ ...p, [key]: !p[key] }),
});
const color = (mode: ColorMode) => ({
  on: (p: A11yPrefs) => p.color === mode,
  apply: (p: A11yPrefs) => ({ ...p, color: mode }),
});
const describeMode = (mode: DescribeMode) => ({
  on: (p: A11yPrefs) => p.describe === mode,
  apply: (p: A11yPrefs) => ({ ...p, describe: p.describe === mode ? 'none' : mode }),
});
const cursorMode = (mode: CursorMode) => ({
  on: (p: A11yPrefs) => p.cursor === mode,
  apply: (p: A11yPrefs) => ({ ...p, cursor: p.cursor === mode ? 'none' : mode }),
});

/** Colour modes are mutually exclusive, so they are one pick-one group. */
const colorTools: Tool[] = [
  { id: 'color-none', label: 'רגיל', icon: Eye, ...color('none') },
  { id: 'monochrome', label: 'מונוכרום', icon: CircleDot, ...color('monochrome') },
  { id: 'sepia', label: 'ספיה', icon: Droplet, ...color('sepia') },
  { id: 'contrast', label: 'ניגודיות גבוהה', icon: Contrast, ...color('contrast') },
  { id: 'black-yellow', label: 'שחור צהוב', icon: PaintBucket, ...color('black-yellow') },
  { id: 'invert', label: 'היפוך צבעים', icon: Blend, ...color('invert') },
];

const readingTools: Tool[] = [
  { id: 'headings', label: 'הדגשת כותרות', icon: Heading, ...toggle('headings') },
  { id: 'links', label: 'הדגשת קישורים', icon: Link2, ...toggle('links') },
  { id: 'readable', label: 'גופן קריא', icon: Type, ...toggle('readable') },
  { id: 'describe-tooltip', label: 'הצגת תיאור', icon: MessageSquareText, ...describeMode('tooltip') },
  { id: 'describe-fixed', label: 'תיאור קבוע', icon: PanelBottom, ...describeMode('fixed') },
  { id: 'no-motion', label: 'ביטול הבהובים', icon: Hand, ...toggle('noMotion') },
];

const navigationTools: Tool[] = [
  { id: 'keyboard', label: 'ניווט מקלדת', icon: Keyboard, ...toggle('keyboard') },
  { id: 'cursor-big', label: 'סמן גדול', icon: MousePointer2, ...cursorMode('big') },
  { id: 'cursor-black', label: 'סמן שחור', icon: MousePointer, ...cursorMode('black') },
];

/* ------------------------------------------------------------------ */
/* Descriptions: show the accessible name of whatever is under the     */
/* pointer or keyboard focus, as a tooltip or in a fixed bar.          */
/* ------------------------------------------------------------------ */

function describe(target: EventTarget | null): { text: string; rect: DOMRect } | null {
  if (!(target instanceof Element) || target.closest('[data-a11y-widget]')) return null;
  const el = target.closest('img, [role="img"], [aria-label], [title]');
  if (!el) return null;

  let text = el.getAttribute('alt') || el.getAttribute('aria-label') || el.getAttribute('title') || '';
  // A decorative image inside a link is described by the link it belongs to.
  if (!text && el.matches('img')) {
    const owner = el.closest('a, button');
    text = owner?.getAttribute('aria-label') || (owner as HTMLElement | null)?.innerText || '';
  }
  text = text.replace(/\s+/g, ' ').trim();
  return text ? { text, rect: el.getBoundingClientRect() } : null;
}

function DescriptionLayer({ mode }: { mode: DescribeMode }) {
  const [info, setInfo] = useState<{ text: string; rect: DOMRect } | null>(null);

  useEffect(() => {
    setInfo(null);
    if (mode === 'none') return;
    const onTarget = (e: Event) => setInfo(describe(e.target));
    const onScroll = () => mode === 'tooltip' && setInfo(null);
    document.addEventListener('pointerover', onTarget);
    document.addEventListener('focusin', onTarget);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('pointerover', onTarget);
      document.removeEventListener('focusin', onTarget);
      window.removeEventListener('scroll', onScroll);
    };
  }, [mode]);

  if (mode === 'fixed') {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-4 bottom-5 z-[110] mx-auto max-w-xl rounded-2xl bg-ink-900 px-5 py-4 text-center text-lg font-medium text-white shadow-[0_16px_40px_-16px_rgb(0_0_0/0.6)] ring-2 ring-sun-400 sm:inset-x-24"
      >
        {info?.text ?? 'העבירו את העכבר או את המיקוד מעל תמונה או כפתור כדי להציג את התיאור שלו'}
      </div>
    );
  }

  if (mode !== 'tooltip' || !info) return null;

  const below = info.rect.bottom + 64 < window.innerHeight;
  const x = clamp(info.rect.left + info.rect.width / 2, 140, window.innerWidth - 140);
  return (
    <div
      aria-hidden="true"
      style={{ left: x, top: below ? info.rect.bottom + 10 : info.rect.top - 10 }}
      className={`pointer-events-none fixed z-[110] max-w-[260px] -translate-x-1/2 rounded-xl bg-ink-900 px-3.5 py-2 text-center text-sm font-medium text-white shadow-lg ring-2 ring-sun-400 ${
        below ? '' : '-translate-y-full'
      }`}
    >
      {info.text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces of the panel                                                 */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[0.8125rem] font-bold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">{title}</h3>
      {children}
    </section>
  );
}

function TileGrid({ tools, prefs, onChange, radioLabel }: {
  tools: Tool[];
  prefs: A11yPrefs;
  onChange: (p: A11yPrefs) => void;
  /** set for a pick-one group */
  radioLabel?: string;
}) {
  return (
    <div
      role={radioLabel ? 'radiogroup' : 'group'}
      aria-label={radioLabel}
      data-tile-grid=""
      className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:flex lg:flex-wrap"
    >
      {tools.map((tool) => {
        const on = tool.on(prefs);
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            type="button"
            data-tile=""
            role={radioLabel ? 'radio' : undefined}
            aria-checked={radioLabel ? on : undefined}
            aria-pressed={radioLabel ? undefined : on}
            onClick={() => onChange(tool.apply(prefs))}
            className={`relative flex min-h-[4.5rem] select-none flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-center text-[0.8125rem] font-medium leading-tight transition-[background-color,color,box-shadow] duration-200 lg:w-[5.75rem] ${
              on
                ? 'bg-brand-600 text-white ring-1 ring-brand-600'
                : 'bg-white text-ink-800 ring-1 ring-white hover:bg-brand-50 hover:ring-brand-300'
            }`}
          >
            <Icon aria-hidden="true" className="size-[1.375rem]" strokeWidth={1.75} />
            {tool.label}
            {on && tool.id !== 'color-none' && (
              <span aria-hidden="true" className="absolute left-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-white text-brand-700">
                <Check className="size-3" strokeWidth={3.5} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ icon: Icon, label, value, canDec, canInc, decLabel, incLabel, onDec, onInc }: {
  icon: LucideIcon;
  label: string;
  value: string;
  canDec: boolean;
  canInc: boolean;
  decLabel: string;
  incLabel: string;
  onDec: () => void;
  onInc: () => void;
}) {
  const btn =
    'flex size-8 items-center justify-center rounded-full bg-white text-ink-800 ring-1 ring-ink-200 transition-[background-color,box-shadow] hover:bg-brand-50 hover:ring-brand-300 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-white aria-disabled:hover:ring-ink-200';
  return (
    <div className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl bg-white px-2 py-2 ring-1 ring-white lg:w-44">
      <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-800">
        <Icon aria-hidden="true" className="size-4 text-brand-600" strokeWidth={1.75} />
        {label}
      </span>
      {/* Reads "− value +" on screen. DOM order is + first, so the RTL arrow keys
          (left = next) move left across the screen, and focus lands on "+" first. */}
      <div dir="ltr" className="flex flex-row-reverse items-center gap-1.5">
        <button type="button" data-tile="" aria-label={incLabel} aria-disabled={!canInc || undefined} onClick={() => canInc && onInc()} className={btn}>
          <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
        </button>
        <output aria-live="polite" className="w-11 text-center text-sm font-bold tabular-nums text-ink-900">
          {value}
        </output>
        <button type="button" data-tile="" aria-label={decLabel} aria-disabled={!canDec || undefined} onClick={() => canDec && onDec()} className={btn}>
          <Minus aria-hidden="true" className="size-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function FloatingAccessibility() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(loadPrefs);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyPrefs(prefs);
    savePrefs(prefs);
  }, [prefs]);

  const returnFocus = useRef(false);
  const close = () => {
    returnFocus.current = true;
    setOpen(false);
  };

  useEffect(() => {
    if (!open && returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => bodyRef.current?.querySelector<HTMLElement>('[data-tile]')?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  // Arrow keys: left/right step through every control (left is "next" in RTL);
  // up/down jump to the nearest control in the row above/below, whatever the layout.
  const onBodyKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const all: HTMLElement[] = bodyRef.current ? Array.from(bodyRef.current.querySelectorAll('[data-tile]')) : [];
    const current = document.activeElement as HTMLElement;
    const i = all.indexOf(current);
    if (i < 0) return;
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowLeft') next = all[i + 1];
    else if (e.key === 'ArrowRight') next = all[i - 1];
    else if (e.key === 'Home') next = all[0];
    else if (e.key === 'End') next = all[all.length - 1];
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const down = e.key === 'ArrowDown';
      const from = current.getBoundingClientRect();
      const cx = from.left + from.width / 2;
      let best = Infinity;
      for (const el of all) {
        const r = el.getBoundingClientRect();
        const dy = down ? r.top - from.bottom : from.top - r.bottom;
        if (dy < -2) continue; // not in that direction
        const score = dy * 4 + Math.abs(r.left + r.width / 2 - cx);
        if (el !== current && score < best) {
          best = score;
          next = el;
        }
      }
    } else return;
    e.preventDefault();
    next?.focus();
  };

  const changed = !isDefault(prefs);
  const update = (p: A11yPrefs) => setPrefs(p);

  return createPortal(
    <div data-a11y-widget="">
      <DescriptionLayer mode={prefs.describe} />

      {/* Floating trigger — steps aside while the bar is open; the bar carries the icon instead */}
      <button
        ref={triggerRef}
        type="button"
        aria-label="תפריט נגישות"
        aria-expanded={open}
        aria-controls="a11y-panel"
        inert={open}
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-[100] flex size-14 items-center justify-center rounded-full bg-ink-900 text-white shadow-[0_12px_28px_-10px_rgb(33_23_42/0.7)] transition-[transform,opacity,background-color] duration-300 ease-out-expo hover:scale-105 hover:bg-ink-800 active:scale-95 ${
          open ? 'pointer-events-none translate-y-4 scale-75 opacity-0' : 'opacity-100'
        }`}
      >
        <Accessibility aria-hidden="true" className="size-8" />
        {changed && (
          <span aria-hidden="true" className="absolute right-0.5 top-0.5 size-3.5 rounded-full border-2 border-white bg-brand-500" />
        )}
      </button>

      {/* Bottom dock: slides up from the screen edge where the trigger sits */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[120] transition-transform duration-500 ease-out-expo ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div
          ref={panelRef}
          id="a11y-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="a11y-panel-title"
          inert={!open}
          className={`flex max-h-[min(78dvh,40rem)] flex-col border-t border-white/20 bg-ink-950/60 text-white backdrop-blur-md backdrop-saturate-150 transition-[visibility] duration-500 ${
            open ? 'visible' : 'invisible'
          }`}
        >
          <div className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1 flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Accessibility className="size-6" />
                </span>
                <div className="min-w-0">
                  <h2 id="a11y-panel-title" className="text-base font-bold leading-tight">
                    תפריט נגישות <span className="text-xs font-medium text-white/80">(ת"י 5568)</span>
                  </h2>
                  <p className="hidden text-xs text-white/85 sm:block">ניתן לנווט בין הכפתורים בעזרת מקשי החיצים</p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="סגירת תפריט הנגישות"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/15 pe-1.5 ps-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25"
              >
                <X aria-hidden="true" className="size-4" />
                <kbd aria-hidden="true" className="rounded-md bg-white px-1.5 py-0.5 font-sans text-[0.6875rem] font-bold text-ink-900">
                  ESC
                </kbd>
              </button>
            </div>

            {/* Tools */}
            <div
              ref={bodyRef}
              onKeyDown={onBodyKeyDown}
              data-lenis-prevent=""
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-3 pt-2 sm:px-6 lg:flex-row lg:flex-wrap lg:gap-x-8 lg:gap-y-3"
            >
              <Section title="גודל">
                <div className="grid grid-cols-2 gap-2 lg:flex">
                  <Stepper
                    icon={AArrowUp}
                    label="גודל גופן"
                    value={percent(fontScale(prefs))}
                    canDec={prefs.font > FONT_RANGE.min}
                    canInc={prefs.font < FONT_RANGE.max}
                    decLabel="הקטנת גופן"
                    incLabel="הגדלת גופן"
                    onDec={() => update({ ...prefs, font: clamp(prefs.font - 1, FONT_RANGE.min, FONT_RANGE.max) })}
                    onInc={() => update({ ...prefs, font: clamp(prefs.font + 1, FONT_RANGE.min, FONT_RANGE.max) })}
                  />
                  <Stepper
                    icon={ZoomIn}
                    label="גודל מסך"
                    value={percent(zoomScale(prefs))}
                    canDec={prefs.zoom > ZOOM_RANGE.min}
                    canInc={prefs.zoom < ZOOM_RANGE.max}
                    decLabel="הקטנת מסך"
                    incLabel="הגדלת מסך"
                    onDec={() => update({ ...prefs, zoom: clamp(prefs.zoom - 1, ZOOM_RANGE.min, ZOOM_RANGE.max) })}
                    onInc={() => update({ ...prefs, zoom: clamp(prefs.zoom + 1, ZOOM_RANGE.min, ZOOM_RANGE.max) })}
                  />
                </div>
              </Section>

              <Section title="צבעים">
                <TileGrid tools={colorTools} prefs={prefs} onChange={update} radioLabel="מצב צבעים" />
              </Section>

              <Section title="ניווט וסמן">
                <TileGrid tools={navigationTools} prefs={prefs} onChange={update} />
              </Section>

              <Section title="תוכן וקריאות">
                <TileGrid tools={readingTools} prefs={prefs} onChange={update} />
              </Section>
            </div>

            {/* Footer links */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-white/15 px-4 py-1.5 text-[0.8125rem] sm:px-6">
              <button
                type="button"
                aria-disabled={!changed || undefined}
                onClick={() => changed && setPrefs(DEFAULT_PREFS)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 font-semibold text-white transition-colors hover:bg-white/15 aria-disabled:cursor-not-allowed aria-disabled:text-white/50 aria-disabled:hover:bg-transparent"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                איפוס הגדרות
              </button>
              <a href="#/accessibility" onClick={() => setOpen(false)} className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 font-medium text-white/90 transition-colors hover:text-white hover:underline">
                <FileText aria-hidden="true" className="size-4" />
                הצהרת נגישות
              </a>
              <a href="#/accessibility" onClick={() => setOpen(false)} className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 font-medium text-white/90 transition-colors hover:text-white hover:underline">
                <Mail aria-hidden="true" className="size-4" />
                דיווח על בעיית נגישות
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
