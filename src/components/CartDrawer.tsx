import { CreditCard, Minus, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice, MAX_QTY, priceLines, useCart } from '../cart';
import { sellables } from '../catalog';
import { useContent } from '../content/store';
import { telHref } from '../legal/business';
import { navigate } from '../useRoute';
import CartIcon from './CartIcon';

const stepButton =
  'inline-flex size-9 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-30';

/** The quantity, typed or stepped. Typing commits on blur or Enter, clamped to 1–20. */
function QtyInput({ qty, name, max, onChange }: { qty: number; name: string; max: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(qty));
  useEffect(() => setText(String(qty)), [qty]);
  const commit = () => {
    const n = Number.parseInt(text, 10);
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(1, n)));
    setText(String(Number.isFinite(n) ? Math.min(max, Math.max(1, n)) : qty));
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      aria-label={`כמות של ${name}`}
      value={text}
      onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
      onFocus={(e) => e.currentTarget.select()}
      className="h-9 w-10 rounded-md bg-transparent text-center font-semibold tabular-nums text-ink-900 focus:bg-white focus:shadow-[0_0_0_3px_var(--color-brand-100)] focus:outline-none"
    />
  );
}

/**
 * The cart, as a modal side sheet. A native <dialog>: focus stays inside while
 * it's open, Escape closes it, and focus returns to the cart button afterwards.
 */
export default function CartDrawer() {
  const { lines, count, isOpen, setQty, remove, close } = useCart();
  const content = useContent();
  const { business } = content;
  const items = useMemo(() => sellables(content), [content]);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Current name and price from the site's content; products that were removed are flagged.
  const { rows, total } = priceLines(lines, items);
  const canCheckout = rows.length > 0 && rows.every((r) => r.available && !r.tooMany);

  return (
    <dialog
      ref={ref}
      aria-labelledby="cart-title"
      onClose={close}
      onClick={(e) => e.target === e.currentTarget && close()} // click on the dimmed backdrop
      className="cart-sheet fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-full max-w-md bg-white p-0 text-ink-900 shadow-[0_0_60px_-10px_rgb(23_15_29/0.45)]"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <h2 id="cart-title" className="font-display text-2xl font-bold">
            סל הקניות
            {count > 0 && <span className="ms-2 text-base font-semibold text-ink-500 tabular-nums">({count})</span>}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="סגירת הסל"
            className="inline-flex size-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X aria-hidden="true" className="size-6" />
          </button>
        </header>

        {rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <CartIcon aria-hidden="true" className="size-7" />
            </span>
            <p className="text-lg font-semibold">הסל ריק</p>
            <p className="text-ink-600">חבילות המסיבה מחכות לכם בדף הבית.</p>
            <a
              href="/#party-in-a-box"
              onClick={close}
              className="mt-2 inline-flex h-12 items-center rounded-full bg-brand-600 px-6 font-semibold text-white transition-colors hover:bg-brand-700"
            >
              לחבילות המסיבה
            </a>
          </div>
        ) : (
          <>
            <ul data-lenis-prevent className="flex-1 divide-y divide-ink-100 overflow-y-auto px-5">
              {rows.map((r) => (
                <li key={r.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{r.name}</p>
                      <p className="text-sm text-ink-600 tabular-nums">
                        {r.available ? `${formatPrice(r.price)} ליחידה` : r.soldOut ? 'אזל מהמלאי' : 'המוצר כבר לא זמין באתר'}
                      </p>
                    </div>
                    <button type="button" onClick={() => remove(r.id)} aria-label={`הסרת ${r.name} מהסל`} className={`${stepButton} hover:bg-brand-50 hover:text-brand-700`}>
                      <Trash2 aria-hidden="true" className="size-[1.125rem]" />
                    </button>
                  </div>
                  {r.available && (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div role="group" aria-label={`כמות של ${r.name}`} className="flex items-center rounded-full ring-1 ring-ink-200">
                        <button type="button" className={stepButton} onClick={() => setQty(r.id, r.qty + 1)} disabled={r.qty >= Math.min(MAX_QTY, r.max)} aria-label="הוספת יחידה">
                          <Plus aria-hidden="true" className="size-4" />
                        </button>
                        <QtyInput qty={r.qty} name={r.name} max={Math.min(MAX_QTY, r.max)} onChange={(n) => setQty(r.id, n)} />
                        <button type="button" className={stepButton} onClick={() => setQty(r.id, r.qty - 1)} aria-label={r.qty === 1 ? `הסרת ${r.name} מהסל` : 'הורדת יחידה'}>
                          <Minus aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                      <p className="font-display text-xl font-bold tabular-nums">{formatPrice(r.price * r.qty)}</p>
                    </div>
                  )}
                  {r.tooMany && (
                    <p role="status" className="mt-2 text-sm font-semibold text-brand-800">
                      נשארו רק {r.max} יחידות. הקטינו את הכמות כדי להמשיך.
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <footer className="shrink-0 border-t border-ink-100 bg-ink-50 px-5 pb-5 pt-4">
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">סה"כ, כולל מע"מ</span>
                <span className="font-display text-3xl font-bold tabular-nums">{formatPrice(total)}</span>
              </p>
              <p className="mt-1 text-sm text-ink-600">
                {business.shipping.cost ? `משלוח: ${business.shipping.cost}. ` : 'לא כולל משלוח. '}
                <a href="/shipping" onClick={close} className="font-medium text-brand-700 underline underline-offset-4">
                  מדיניות המשלוחים
                </a>
              </p>

              <button
                type="button"
                disabled={!canCheckout}
                onClick={() => {
                  close();
                  navigate('/checkout');
                }}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-300"
              >
                <CreditCard aria-hidden="true" className="size-5" />
                להזמנה ולתשלום
              </button>
              <p className="mt-2 text-center text-sm text-ink-600">
                {canCheckout ? (
                  <>
                    או בטלפון{' '}
                    <a href={`tel:${telHref(business.phone)}`} dir="ltr" className="font-semibold text-brand-700 underline underline-offset-4">
                      {business.phone}
                    </a>
                  </>
                ) : (
                  'יש בסל מוצר שאזל או שכבר לא זמין, או כמות גדולה ממה שנשאר: עדכנו את הסל כדי להמשיך.'
                )}
              </p>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}
