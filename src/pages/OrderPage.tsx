import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { formatPrice, useCart } from '../cart';
import { useBusiness } from '../content/store';
import { telHref } from '../legal/business';
import NotFound from './NotFound';

type OrderStatus = {
  number: number;
  status: 'pending' | 'paid' | 'failed' | 'fulfilled' | 'cancelled';
  items: { name: string; qty: number; lineTotal: string }[];
  deliveryMethod: 'delivery' | 'pickup';
  deliveryFee: string;
  total: string;
  numPayments: number | null;
};

const POLLS = 10;

/**
 * Where Cardcom sends the customer back after paying (/order/<token>). The status
 * comes from our server, which checks the payment with Cardcom itself; the address
 * Cardcom returns to proves nothing on its own.
 */
export default function OrderPage({ token }: { token: string }) {
  const business = useBusiness();
  const { clear } = useCart();
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [missing, setMissing] = useState(false);
  const [polls, setPolls] = useState(0);
  const cleared = useRef(false);
  const failedHint = new URLSearchParams(window.location.search).has('failed');

  useEffect(() => {
    if (order && order.status !== 'pending') return;
    if (polls >= POLLS) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(
      () =>
        api<OrderStatus>(`/api/orders/${encodeURIComponent(token)}/`, { signal: ctrl.signal })
          .then((o) => {
            setOrder(o);
            setPolls((n) => n + 1);
          })
          .catch((e) => {
            if (e instanceof ApiError && e.status === 404) setMissing(true);
            else if ((e as Error).name !== 'AbortError') setPolls((n) => n + 1);
          }),
      polls === 0 ? 0 : 2500,
    );
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [token, polls, order]);

  // Paid: the cart's job is done.
  useEffect(() => {
    if (!cleared.current && order && (order.status === 'paid' || order.status === 'fulfilled')) {
      cleared.current = true;
      clear();
    }
  }, [order, clear]);

  if (missing) return <NotFound text="ההזמנה לא נמצאה. בדקו שהקישור מלא." />;

  const paid = order?.status === 'paid' || order?.status === 'fulfilled';
  const failed = order?.status === 'failed' || order?.status === 'cancelled' || (order?.status === 'pending' && failedHint);
  const stillChecking = !order || (order.status === 'pending' && !failedHint);

  const phone = business.phone && (
    <a href={`tel:${telHref(business.phone)}`} dir="ltr" className="font-semibold text-brand-700 underline underline-offset-4">
      {business.phone}
    </a>
  );

  return (
    <section aria-labelledby="order-title" aria-live="polite" className="mx-auto w-full max-w-2xl px-4 pt-10 sm:px-6 md:pt-16">
      {paid && order ? (
        <>
          <CheckCircle2 aria-hidden="true" className="size-14 text-lagoon-600" />
          <h1 id="order-title" className="mt-4 font-display text-4xl font-bold text-ink-900">
            תודה! התשלום התקבל
          </h1>
          <p className="mt-3 text-lg text-ink-700">
            מספר ההזמנה: <strong className="tabular-nums">{order.number}</strong>. שמרו אותו לכל שאלה{phone ? ', בטלפון ' : ''}
            {phone}.
          </p>
          <div className="mt-8 rounded-3xl bg-ink-50 p-6 ring-1 ring-ink-100">
            <ul className="flex flex-col gap-2 text-ink-700">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-3">
                  <span>
                    {i.name} <span className="text-ink-500 tabular-nums">× {i.qty}</span>
                  </span>
                  <span className="tabular-nums">{formatPrice(Number(i.lineTotal))}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3">
                <span>{order.deliveryMethod === 'delivery' ? 'משלוח' : 'איסוף עצמי מהחנות'}</span>
                <span className="tabular-nums">{Number(order.deliveryFee) > 0 ? formatPrice(Number(order.deliveryFee)) : 'ללא עלות'}</span>
              </li>
            </ul>
            <p className="mt-4 flex items-baseline justify-between gap-3 border-t border-ink-200 pt-4">
              <span className="font-semibold">
                שולם{order.numPayments && order.numPayments > 1 ? `, ב-${order.numPayments} תשלומים` : ''}
              </span>
              <span className="font-display text-3xl font-bold tabular-nums">{formatPrice(Number(order.total))}</span>
            </p>
          </div>
          <a href="/" className="mt-8 inline-flex h-12 items-center rounded-full bg-brand-600 px-6 font-semibold text-white transition-colors hover:bg-brand-700">
            חזרה לחנות
          </a>
        </>
      ) : failed ? (
        <>
          <XCircle aria-hidden="true" className="size-14 text-brand-600" />
          <h1 id="order-title" className="mt-4 font-display text-4xl font-bold text-ink-900">
            התשלום לא הושלם
          </h1>
          <p className="mt-3 text-lg text-ink-700">התשלום לא אושר, ולכן ההזמנה לא נקלטה. המוצרים עדיין בסל: אפשר לנסות שוב, או להזמין בטלפון {phone}.</p>
          <a href="/checkout" className="mt-8 inline-flex h-12 items-center rounded-full bg-brand-600 px-6 font-semibold text-white transition-colors hover:bg-brand-700">
            לנסות שוב
          </a>
        </>
      ) : (
        <>
          <Clock aria-hidden="true" className="size-14 text-sun-500" />
          <h1 id="order-title" className="mt-4 font-display text-4xl font-bold text-ink-900">
            {stillChecking && polls < POLLS ? 'בודקים את התשלום…' : 'התשלום עדיין בבדיקה'}
          </h1>
          <p className="mt-3 text-lg text-ink-700">
            {polls < POLLS
              ? 'זה לוקח רק כמה שניות. אין צורך לרענן את העמוד.'
              : 'עוד לא קיבלנו אישור מחברת הסליקה. אם חויבתם, ההזמנה תאושר אוטומטית. לכל שאלה: '}
            {polls >= POLLS && phone}
          </p>
          {order && <p className="mt-2 text-ink-600">מספר ההזמנה: {order.number}</p>}
        </>
      )}
    </section>
  );
}
