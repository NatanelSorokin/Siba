import { Bell, MapPin, Phone, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { api, ApiError } from '../api';
import { formatPrice } from '../cart';
import { telHref } from '../legal/business';

type Status = 'pending' | 'paid' | 'preparing' | 'failed' | 'fulfilled' | 'cancelled';

export type AdminOrder = {
  id: number;
  number: number;
  status: Status;
  createdAt: string;
  paidAt: string | null;
  items: { name: string; qty: number; lineTotal: string }[];
  deliveryMethod: 'delivery' | 'pickup';
  deliveryFee: string;
  subtotal: string;
  total: string;
  numPayments: number | null;
  customer: { name: string; phone: string; email: string };
  address: string;
  city: string;
  notes: string;
  staffNote: string;
  transactionId: string;
  approvalNumber: string;
  cardLast4: string;
  paymentError: string;
};

/** Fired when an order changes, so the "הזמנות" badge updates. */
export const ORDERS_CHANGED = 'siba:orders-changed';

const STATUS: Record<Status, { label: string; tone: string }> = {
  paid: { label: 'חדשה', tone: 'bg-brand-600 text-white' },
  preparing: { label: 'בהכנה', tone: 'bg-sun-300 text-ink-900' },
  fulfilled: { label: 'נשלחה / נאספה', tone: 'bg-lagoon-300/50 text-ink-900' },
  pending: { label: 'ממתינה לתשלום', tone: 'bg-ink-100 text-ink-700' },
  failed: { label: 'התשלום לא עבר', tone: 'bg-ink-100 text-ink-700' },
  cancelled: { label: 'בוטלה', tone: 'bg-ink-100 text-ink-500' },
};

type Tab = 'new' | 'preparing' | 'done' | 'unpaid' | 'all';
const TABS: { id: Tab; label: string; match: (s: Status) => boolean }[] = [
  { id: 'new', label: 'חדשות', match: (s) => s === 'paid' },
  { id: 'preparing', label: 'בהכנה', match: (s) => s === 'preparing' },
  { id: 'done', label: 'נשלחו / נאספו', match: (s) => s === 'fulfilled' },
  { id: 'unpaid', label: 'לא שולמו', match: (s) => s === 'pending' || s === 'failed' || s === 'cancelled' },
  { id: 'all', label: 'הכול', match: () => true },
];

/** The next steps the owner can take from each status. */
const ACTIONS: Partial<Record<Status, { to: Status; label: string; primary?: boolean }[]>> = {
  paid: [
    { to: 'preparing', label: 'התחלת הכנה', primary: true },
    { to: 'fulfilled', label: 'נשלחה / נאספה' },
  ],
  preparing: [
    { to: 'fulfilled', label: 'נשלחה / נאספה', primary: true },
    { to: 'paid', label: 'החזרה לחדשות' },
  ],
  fulfilled: [{ to: 'preparing', label: 'החזרה להכנה' }],
  pending: [{ to: 'cancelled', label: 'ביטול' }],
  failed: [{ to: 'cancelled', label: 'ביטול' }],
};

const when = (iso: string) => new Date(iso).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const button =
  'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ring-1 ring-ink-200 transition-colors hover:bg-ink-100 disabled:opacity-50';
const primaryButton = 'inline-flex h-9 items-center rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50';
const field =
  'w-full rounded-xl border border-ink-200 bg-white px-3 text-[0.9375rem] text-ink-900 transition-[border-color,box-shadow] focus:border-brand-400 focus:shadow-[0_0_0_3px_var(--color-brand-100)] focus:outline-none';

/* ------------------------------------------------------------------ */

type ShopSettings = { notifyEmail: string; emailReady: boolean; emailServer: boolean };

function EmailSettings() {
  const id = useId();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<ShopSettings>('/api/admin/settings/')
      .then((s) => {
        setSettings(s);
        setEmail(s.notifyEmail);
      })
      .catch(() => undefined);
  }, []);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setNote(null);
    try {
      setNote({ text: await action() });
    } catch (e) {
      setNote({ text: e instanceof ApiError ? e.message : 'הפעולה נכשלה.', error: true });
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const s = await api<ShopSettings>('/api/admin/settings/', { method: 'PUT', json: { notifyEmail: email } });
      setSettings(s);
      return s.notifyEmail ? 'נשמר. כל הזמנה ששולמה תישלח גם לכתובת הזו.' : 'נשמר: התראות במייל כבויות.';
    });
  const test = () =>
    run(async () => {
      await api('/api/admin/settings/test-email/', { method: 'POST' });
      return settings?.emailServer ? 'נשלח מייל בדיקה. אם לא הגיע תוך כמה דקות, בדקו גם בדואר הזבל.' : 'מייל הבדיקה הודפס ביומן השרת (בסביבת הפיתוח לא נשלחים מיילים אמיתיים).';
    });

  if (!settings) return null;
  const dirty = email.trim() !== settings.notifyEmail;

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-ink-200">
      <h3 className="flex items-center gap-2 font-bold text-ink-900">
        <Bell aria-hidden="true" className="size-5 text-brand-600" />
        התראה במייל על כל הזמנה חדשה
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">
        המייל כולל את מספר ההזמנה, המוצרים והסכום, וקישור לכאן. פרטי הלקוח (שם, טלפון, כתובת) מוצגים רק כאן, כדי שלא יישמרו בתיבת
        הדואר. הכתובת נשמרת בשרת בלבד ולא מוצגת באתר.
      </p>
      {!settings.emailReady && (
        <p className="mt-2 text-sm font-semibold text-brand-800">שרת הדואר עוד לא הוגדר בשרת האתר, ולכן עדיין לא יישלחו מיילים (ההוראות ב-backend/README.md).</p>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink-900">
            לאיזו כתובת לשלוח
          </label>
          <input id={id} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={`${field} h-10 text-right`} />
        </div>
        <button type="button" onClick={() => void save()} disabled={busy || !dirty} className={primaryButton}>
          שמירה
        </button>
        <button type="button" onClick={() => void test()} disabled={busy || dirty || !settings.notifyEmail} className={button}>
          שליחת מייל בדיקה
        </button>
      </div>
      {note && (
        <p role={note.error ? 'alert' : 'status'} className={`mt-2 text-sm ${note.error ? 'font-semibold text-brand-800' : 'text-lagoon-700'}`}>
          {note.text}
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function StaffNote({ order, onSaved }: { order: AdminOrder; onSaved: (o: AdminOrder) => void }) {
  const id = useId();
  const [text, setText] = useState(order.staffNote);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => setText(order.staffNote), [order.staffNote]);

  const save = async () => {
    if (text.trim() === order.staffNote) return;
    setState('saving');
    try {
      onSaved(await api<AdminOrder>(`/api/admin/orders/${order.id}/`, { method: 'POST', json: { staffNote: text } }));
      setState('saved');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="mt-4">
      <label htmlFor={id} className="mb-1 flex items-center justify-between text-sm font-semibold text-ink-900">
        הערה פנימית
        <span className={`text-xs font-normal ${state === 'error' ? 'font-semibold text-brand-800' : 'text-ink-500'}`}>
          {state === 'saving' ? 'שומר…' : state === 'saved' ? 'נשמר' : state === 'error' ? 'השמירה נכשלה' : 'רק לך, הלקוח לא רואה'}
        </span>
      </label>
      <textarea id={id} rows={2} maxLength={1000} value={text} onChange={(e) => { setText(e.target.value); setState('idle'); }} onBlur={() => void save()} placeholder="למשל: דיברתי איתה, איסוף ביום חמישי" className={`${field} py-2`} />
    </div>
  );
}

function OrderCard({ order: o, busy, onStatus, onSaved }: { order: AdminOrder; busy: boolean; onStatus: (o: AdminOrder, s: Status) => void; onSaved: (o: AdminOrder) => void }) {
  const paid = o.status === 'paid' || o.status === 'preparing' || o.status === 'fulfilled';
  return (
    <li className={`rounded-2xl bg-white p-5 ring-1 ${o.status === 'paid' ? 'ring-2 ring-brand-300' : 'ring-ink-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-ink-900">
            הזמנה <span className="tabular-nums">{o.number}</span>
          </h3>
          <p className="text-sm text-ink-600">{when(o.paidAt ?? o.createdAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS[o.status].tone}`}>{STATUS[o.status].label}</span>
      </div>

      <div className="mt-4 grid gap-5 text-[0.9375rem] md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-ink-900">{o.customer.name}</p>
          <a href={`tel:${telHref(o.customer.phone)}`} className="inline-flex w-fit items-center gap-1.5 text-brand-700 underline-offset-4 hover:underline">
            <Phone aria-hidden="true" className="size-4" />
            <span dir="ltr">{o.customer.phone}</span>
          </a>
          <a href={`mailto:${o.customer.email}`} dir="ltr" className="w-fit text-brand-700 underline-offset-4 hover:underline">
            {o.customer.email}
          </a>
          <p className="mt-1 flex items-start gap-1.5 text-ink-700">
            <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
            {o.deliveryMethod === 'delivery' ? `משלוח: ${o.address}, ${o.city}` : 'איסוף עצמי מהחנות'}
          </p>
          {o.notes && <p className="mt-1 rounded-lg bg-sun-100 p-2 text-ink-800">הערת הלקוח: {o.notes}</p>}
        </div>
        <div>
          <ul className="flex flex-col gap-1 text-ink-700">
            {o.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span>
                  {i.name} <span className="font-semibold text-ink-900">× {i.qty}</span>
                </span>
                <span className="tabular-nums">{formatPrice(Number(i.lineTotal))}</span>
              </li>
            ))}
            {Number(o.deliveryFee) > 0 && (
              <li className="flex justify-between gap-3">
                <span>משלוח</span>
                <span className="tabular-nums">{formatPrice(Number(o.deliveryFee))}</span>
              </li>
            )}
          </ul>
          <p className="mt-2 flex justify-between gap-3 border-t border-ink-100 pt-2 font-bold text-ink-900">
            <span>{paid ? 'שולם' : 'סה"כ'}</span>
            <span className="tabular-nums">{formatPrice(Number(o.total))}</span>
          </p>
          {o.transactionId && (
            <p className="mt-1 text-sm text-ink-600">
              עסקה {o.transactionId}
              {o.cardLast4 && ` · כרטיס ${o.cardLast4}`}
              {o.numPayments && o.numPayments > 1 ? ` · ${o.numPayments} תשלומים` : ''}
            </p>
          )}
          {o.paymentError && <p className="mt-1 text-sm text-brand-800">{o.paymentError}</p>}
        </div>
      </div>

      {paid && <StaffNote order={o} onSaved={onSaved} />}

      {ACTIONS[o.status] && (
        <div className="mt-4 flex flex-wrap gap-2">
          {ACTIONS[o.status]!.map((a) => (
            <button key={a.to} type="button" disabled={busy} onClick={() => onStatus(o, a.to)} className={a.primary ? primaryButton : button}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */

/** The orders placed on the site, to work through. Customers' details are shown only here, to the signed-in owner. */
export default function OrdersSection() {
  const searchId = useId();
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('new');
  const [query, setQuery] = useState('');
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders((await api<{ orders: AdminOrder[] }>('/api/admin/orders/')).orders);
      setLoadedAt(new Date());
      setError('');
      window.dispatchEvent(new Event(ORDERS_CHANGED));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'טעינת ההזמנות נכשלה.');
    }
  }, []);

  // New orders show up by themselves while the page is open.
  useEffect(() => {
    void load();
    const t = window.setInterval(() => document.visibilityState === 'visible' && void load(), 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  const replace = (next: AdminOrder) => setOrders((list) => list?.map((o) => (o.id === next.id ? next : o)) ?? null);

  const setStatus = async (order: AdminOrder, status: Status) => {
    setBusy(order.id);
    try {
      replace(await api<AdminOrder>(`/api/admin/orders/${order.id}/`, { method: 'POST', json: { status } }));
      window.dispatchEvent(new Event(ORDERS_CHANGED));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'העדכון נכשל.');
    } finally {
      setBusy(null);
    }
  };

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, orders?.filter((o) => t.match(o.status)).length ?? 0])) as Record<Tab, number>, [orders]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const match = TABS.find((t) => t.id === tab)!.match;
    return (orders ?? []).filter((o) => {
      if (q) {
        // A search looks through every order, whatever the tab.
        return (
          String(o.number).includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.customer.email.toLowerCase().includes(q) ||
          (digits.length >= 3 && o.customer.phone.replace(/\D/g, '').includes(digits))
        );
      }
      return match(o.status);
    });
  }, [orders, tab, query]);

  if (error && !orders) {
    return (
      <p role="alert" className="rounded-2xl bg-brand-50 p-4 font-semibold text-brand-800">
        {error}
      </p>
    );
  }
  if (!orders) return <p className="text-ink-600">טוען הזמנות…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="סינון הזמנות" className="flex flex-wrap gap-1 rounded-full bg-ink-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id && !query}
              onClick={() => {
                setTab(t.id);
                setQuery('');
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-ink-600 transition-colors hover:text-ink-900 aria-selected:bg-white aria-selected:text-ink-900 aria-selected:shadow-sm"
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${t.id === 'new' && counts.new > 0 ? 'bg-brand-600 text-white' : 'bg-ink-200/70 text-ink-700'}`}>{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-56 flex-1">
          <label htmlFor={searchId} className="sr-only">
            חיפוש הזמנה
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
          <input id={searchId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="מספר הזמנה, שם, טלפון או מייל" className={`${field} h-10 ps-9`} />
        </div>
        <button type="button" onClick={() => void load()} className={button} title={loadedAt ? `עודכן ב-${loadedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : undefined}>
          <RefreshCw aria-hidden="true" className="size-4" />
          רענון
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-800">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-ink-600 ring-1 ring-ink-200">
          {query ? 'לא נמצאה הזמנה מתאימה.' : tab === 'new' ? 'אין הזמנות חדשות. הזמנה ששולמה תופיע כאן מיד (הרשימה מתרעננת כל דקה).' : 'אין כאן הזמנות.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((o) => (
            <OrderCard key={o.id} order={o} busy={busy === o.id} onStatus={(order, s) => void setStatus(order, s)} onSaved={replace} />
          ))}
        </ul>
      )}

      <EmailSettings />

      <p className="text-sm text-ink-600">הזמנות שלא שולמו נמחקות אוטומטית אחרי 30 יום. החזר כספי מבצעים בממשק של Cardcom.</p>
    </div>
  );
}
