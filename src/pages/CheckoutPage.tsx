import { Lock, PhoneCall } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useId, useMemo, useState } from 'react';
import { api, ApiError } from '../api';
import { formatPrice, priceLines, useCart } from '../cart';
import { sellables } from '../catalog';
import { useContent } from '../content/store';
import { telHref } from '../legal/business';

type Options = { enabled: boolean; delivery: boolean; deliveryFee: string; pickup: boolean; maxPayments: number };
type Method = 'delivery' | 'pickup';

const input =
  'h-12 w-full rounded-xl border border-ink-200 bg-white px-4 text-base text-ink-900 transition-[border-color,box-shadow] placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-400 focus:shadow-[0_0_0_4px_var(--color-brand-100)] focus:outline-none';

function Field({ label, children, hint }: { label: string; children: (id: string) => ReactNode; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-semibold text-ink-900">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1.5 text-sm text-ink-600">{hint}</p>}
    </div>
  );
}

/**
 * Checkout: the customer's details, then off to Cardcom's secure page to pay.
 * Card details are typed only there. Nothing typed here is kept in the browser,
 * and it is sent once, to this site's own server.
 */
export default function CheckoutPage() {
  const content = useContent();
  const { business } = content;
  const { lines, open: openCart } = useCart();
  const items = useMemo(() => sellables(content), [content]);
  const { rows, total: subtotal } = priceLines(lines, items);
  const available = rows.filter((r) => r.available && !r.tooMany);

  const [options, setOptions] = useState<Options | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [method, setMethod] = useState<Method | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    api<Options>('/api/checkout/', { signal: ctrl.signal })
      .then((o) => {
        setOptions(o);
        setMethod(o.delivery ? 'delivery' : o.pickup ? 'pickup' : null);
      })
      .catch((e) => (e as Error).name !== 'AbortError' && setLoadError(true));
    return () => ctrl.abort();
  }, []);

  const fee = method === 'delivery' && options ? Number(options.deliveryFee) : 0;
  const total = subtotal + fee;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const text = (name: string) => String(f.get(name) ?? '').trim();
    setError('');
    setBusy(true);
    try {
      const res = await api<{ paymentUrl: string }>('/api/orders/', {
        method: 'POST',
        json: {
          items: available.map((r) => ({ id: r.id, qty: r.qty })),
          customer: { name: text('name'), phone: text('phone'), email: text('email') },
          delivery: { method, address: text('address'), city: text('city') },
          notes: text('notes'),
          acceptedTerms: f.get('terms') === 'on',
        },
      });
      // Cardcom's payment page. The server only ever answers with a Cardcom address.
      if (!/^https?:\/\//.test(res.paymentUrl)) throw new ApiError('לא הצלחנו לפתוח את עמוד התשלום.', 0);
      window.location.assign(res.paymentUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'משהו השתבש. נסו שוב בעוד רגע.');
      setBusy(false);
    }
  };

  const phoneLink = business.phone && (
    <a href={`tel:${telHref(business.phone)}`} className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-6 font-semibold text-white transition-colors hover:bg-brand-700">
      <PhoneCall aria-hidden="true" className="size-5" />
      להזמנה בטלפון <span dir="ltr">{business.phone}</span>
    </a>
  );

  let body: ReactNode;
  if (available.length === 0) {
    body = (
      <div className="flex flex-col items-start gap-4">
        <p className="text-lg text-ink-700">הסל ריק, אין עדיין מה לשלם.</p>
        <a href="/" className="inline-flex h-12 items-center rounded-full bg-brand-600 px-6 font-semibold text-white transition-colors hover:bg-brand-700">
          לדף הבית
        </a>
      </div>
    );
  } else if (loadError || (options && !options.enabled) || (options && !options.delivery && !options.pickup)) {
    body = (
      <div className="flex flex-col items-start gap-4 rounded-3xl bg-brand-50 p-8 ring-1 ring-brand-100">
        <p className="text-xl font-bold text-ink-900">התשלום באתר עדיין לא זמין.</p>
        <p className="text-ink-700">אפשר להשלים את ההזמנה בטלפון: מוסרים את פרטי הסל ומשלמים מול נציג.</p>
        {phoneLink}
      </div>
    );
  } else if (!options) {
    body = <p className="text-ink-600">טוען…</p>;
  } else {
    body = (
      <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start" noValidate={false}>
        <div className="flex flex-col gap-8">
          <fieldset className="grid gap-5 sm:grid-cols-2">
            <legend className="mb-4 font-display text-2xl font-bold text-ink-900">פרטים ליצירת קשר</legend>
            <Field label="שם מלא">{(id) => <input id={id} name="name" required maxLength={80} autoComplete="name" className={input} />}</Field>
            <Field label="טלפון נייד">
              {(id) => <input id={id} name="phone" type="tel" required maxLength={20} autoComplete="tel" inputMode="tel" dir="ltr" className={`${input} text-right`} />}
            </Field>
            <div className="sm:col-span-2">
              <Field label='דוא"ל' hint="לאישור ההזמנה. לא נשלח אליו דיוור.">
                {(id) => <input id={id} name="email" type="email" required maxLength={120} autoComplete="email" dir="ltr" className={`${input} text-right`} />}
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-4 font-display text-2xl font-bold text-ink-900">איך מקבלים את ההזמנה</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {options.delivery && (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink-200 transition-shadow has-[:checked]:ring-2 has-[:checked]:ring-brand-600">
                  <input type="radio" name="method" value="delivery" checked={method === 'delivery'} onChange={() => setMethod('delivery')} className="mt-1 size-5 accent-brand-600" />
                  <span>
                    <span className="block font-semibold text-ink-900">משלוח עד הבית</span>
                    <span className="text-sm text-ink-600">{Number(options.deliveryFee) > 0 ? formatPrice(Number(options.deliveryFee)) : 'חינם'}</span>
                  </span>
                </label>
              )}
              {options.pickup && (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink-200 transition-shadow has-[:checked]:ring-2 has-[:checked]:ring-brand-600">
                  <input type="radio" name="method" value="pickup" checked={method === 'pickup'} onChange={() => setMethod('pickup')} className="mt-1 size-5 accent-brand-600" />
                  <span>
                    <span className="block font-semibold text-ink-900">איסוף עצמי מהחנות</span>
                    <span className="text-sm text-ink-600">{business.address || 'ללא עלות'}</span>
                  </span>
                </label>
              )}
            </div>
            {method === 'delivery' && (
              <div className="mt-5 grid gap-5 sm:grid-cols-[2fr_1fr]">
                <Field label="רחוב ומספר בית">{(id) => <input id={id} name="address" required maxLength={120} autoComplete="street-address" className={input} />}</Field>
                <Field label="עיר">{(id) => <input id={id} name="city" required maxLength={60} autoComplete="address-level2" className={input} />}</Field>
              </div>
            )}
          </fieldset>

          <Field label="הערות להזמנה (לא חובה)">{(id) => <textarea id={id} name="notes" maxLength={500} rows={3} className={`${input} h-auto py-3`} />}</Field>
        </div>

        {/* Summary */}
        <aside className="flex flex-col gap-4 rounded-3xl bg-ink-50 p-6 ring-1 ring-ink-100 lg:sticky lg:top-40">
          <h2 className="font-display text-2xl font-bold text-ink-900">ההזמנה שלך</h2>
          <ul className="flex flex-col gap-2 text-ink-700">
            {available.map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span>
                  {r.name} <span className="text-ink-500 tabular-nums">× {r.qty}</span>
                </span>
                <span className="tabular-nums">{formatPrice(r.price * r.qty)}</span>
              </li>
            ))}
            {method === 'delivery' && (
              <li className="flex justify-between gap-3">
                <span>משלוח</span>
                <span className="tabular-nums">{fee > 0 ? formatPrice(fee) : 'חינם'}</span>
              </li>
            )}
          </ul>
          <p className="flex items-baseline justify-between gap-3 border-t border-ink-200 pt-4">
            <span className="font-semibold">סה"כ לתשלום, כולל מע"מ</span>
            <span className="font-display text-3xl font-bold tabular-nums">{formatPrice(total)}</span>
          </p>
          {options.maxPayments > 1 && <p className="text-sm text-ink-600">אפשר לחלק לעד {options.maxPayments} תשלומים בעמוד התשלום.</p>}
          {rows.length > available.length && (
            <p role="status" className="rounded-xl bg-sun-100 p-3 text-sm text-ink-900 ring-1 ring-sun-500">
              חלק מהמוצרים בסל אזלו, או שנשארו מהם פחות יחידות, ולכן הם לא כלולים בהזמנה.{' '}
              <button type="button" onClick={openCart} className="font-semibold text-brand-700 underline underline-offset-4">
                לעדכון הסל
              </button>
            </p>
          )}

          <label className="flex items-start gap-3 text-sm text-ink-700">
            <input type="checkbox" name="terms" required className="mt-0.5 size-5 shrink-0 accent-brand-600" />
            <span>
              קראתי ואני מסכים/ה ל
              <a href="/terms" target="_blank" rel="noopener" className="font-semibold text-brand-700 underline underline-offset-4">
                תקנון ותנאי הרכישה
              </a>{' '}
              ול
              <a href="/privacy" target="_blank" rel="noopener" className="font-semibold text-brand-700 underline underline-offset-4">
                מדיניות הפרטיות
              </a>
              .
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-800 ring-1 ring-brand-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !method}
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-brand-600 text-lg font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-wait disabled:bg-brand-400"
          >
            <Lock aria-hidden="true" className="size-5" />
            {busy ? 'פותח את עמוד התשלום…' : 'לתשלום מאובטח'}
          </button>
          <p className="text-sm leading-relaxed text-ink-600">
            התשלום מתבצע בעמוד המאובטח של חברת הסליקה Cardcom. פרטי הכרטיס מוקלדים שם בלבד, ואינם עוברים דרך האתר שלנו ואינם נשמרים בו.
          </p>
        </aside>
      </form>
    );
  }

  return (
    <section aria-labelledby="checkout-title" className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 md:pt-12">
      <h1 id="checkout-title" className="mb-8 font-display text-4xl font-bold text-ink-900 md:text-5xl">
        הזמנה ותשלום
      </h1>
      {body}
    </section>
  );
}
