import {
  AlertTriangle,
  Building2,
  Check,
  CreditCard,
  Download,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Monitor,
  Package,
  PanelBottom,
  PartyPopper,
  Receipt,
  Rocket,
  Smartphone,
  ShoppingBag,
  Sparkles,
  Undo2,
  Upload,
  Users,
} from 'lucide-react';
import { type ComponentType, useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, type Session } from '../api';
import { navigate, onLocationChange } from '../useRoute';
import Logo from '../components/Logo';
import { downloadContent, normalize, PREVIEW_DRAFT, PREVIEW_READY } from '../content/store';
import { missingFields } from '../legal/business';
import { AdminProvider, type SaveState, type ServerContent, useEditor } from './adminStore';
import LoginScreen from './LoginScreen';
import OrdersSection, { ORDERS_CHANGED } from './Orders';
import {
  BusinessSection,
  CatalogSection,
  CategoriesSection,
  CheckoutSection,
  FooterSection,
  HeroSection,
  PackagesSection,
  ThemesSection,
} from './sections';

type SectionId = 'overview' | 'orders' | 'business' | 'catalog' | 'checkout' | 'hero' | 'categories' | 'themes' | 'packages' | 'footer';

const SECTIONS: { id: SectionId; label: string; icon: ComponentType<{ className?: string }>; preview: string; intro: string }[] = [
  { id: 'overview', label: 'סקירה', icon: LayoutDashboard, preview: '/', intro: 'מה מוכן, מה חסר, ומה עדיין לא פורסם.' },
  { id: 'business', label: 'פרטי העסק', icon: Building2, preview: 'site-footer', intro: 'פרטי הקשר והפרטים שהחוק מחייב להציג באתר.' },
  { id: 'orders', label: 'הזמנות', icon: Receipt, preview: '', intro: 'ההזמנות מהאתר, מהחדשה לישנה. פרטי הלקוחות מוצגים רק כאן.' },
  { id: 'catalog', label: 'מוצרים', icon: ShoppingBag, preview: '/', intro: 'הקטגוריות שבתפריט, וכל המוצרים שבכל אחת מהן.' },
  { id: 'checkout', label: 'תשלום ומשלוח', icon: CreditCard, preview: '', intro: 'התשלום באתר, דמי המשלוח ואיסוף עצמי.' },
  { id: 'hero', label: 'באנר ראשי', icon: Sparkles, preview: '/', intro: 'העיגול הוורוד ומדבקת המחיר בראש דף הבית.' },
  { id: 'categories', label: 'קטגוריות', icon: LayoutGrid, preview: 'top-categories', intro: 'התמונות הגדולות שמתחת לבאנר.' },
  { id: 'themes', label: 'מסיבות לפי נושא', icon: PartyPopper, preview: 'themes', intro: 'הכרטיסים הגדולים של מסיבות הנושא.' },
  { id: 'packages', label: 'חבילות', icon: Package, preview: 'party-in-a-box', intro: 'חבילות המסיבה, המחירים ומה כלול בכל אחת.' },
  { id: 'footer', label: 'כותרת תחתונה', icon: PanelBottom, preview: 'site-footer', intro: 'הטקסטים שבתחתית כל עמוד.' },
];

const EDITORS: Partial<Record<SectionId, ComponentType>> = {
  business: BusinessSection,
  orders: OrdersSection,
  catalog: CatalogSection,
  checkout: CheckoutSection,
  hero: HeroSection,
  categories: CategoriesSection,
  themes: ThemesSection,
  packages: PackagesSection,
  footer: FooterSection,
};

const sectionFromPath = (): SectionId => {
  const id = window.location.pathname.match(/^\/admin\/([a-z]+)/)?.[1] as SectionId | undefined;
  return id && SECTIONS.some((s) => s.id === id) ? id : 'overview';
};

const sectionHref = (id: SectionId) => (id === 'overview' ? '/admin' : `/admin/${id}`);
// A section's preview is a page ("/", "/category/balloons") or an anchor on the home page ("themes").
const siteHref = (target: string) => (target.startsWith('/') ? target : `/#${target}`);
const previewHref = (target: string) => (target.startsWith('/') ? `${target}?preview=1` : `/?preview=1#${target}`);

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('he-IL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/* ------------------------------------------------------------------ */

type OrdersSummary = { new: number; preparing: number };

/** Orders waiting for the owner, checked every minute while the panel is open. */
function useOrdersSummary(): OrdersSummary | null {
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  useEffect(() => {
    const load = () => api<OrdersSummary>('/api/admin/orders/summary/').then(setSummary).catch(() => undefined);
    void load();
    const t = window.setInterval(() => document.visibilityState === 'visible' && void load(), 60_000);
    window.addEventListener(ORDERS_CHANGED, load);
    return () => {
      window.clearInterval(t);
      window.removeEventListener(ORDERS_CHANGED, load);
    };
  }, []);
  return summary;
}

function Overview({ onFix, orders }: { onFix: (field: string) => void; orders: OrdersSummary | null }) {
  const { content, isDraft, publishedAt, publishedBy } = useEditor();
  const missing = missingFields(content.business);

  return (
    <div className="flex flex-col gap-5">
      {orders && (
        <section className={`rounded-2xl p-5 ring-1 sm:p-6 ${orders.new > 0 ? 'bg-brand-50 ring-brand-200' : 'bg-white ring-ink-200'}`}>
          <h2 className="text-lg font-bold text-ink-900">
            {orders.new === 0 ? 'אין הזמנות חדשות' : orders.new === 1 ? 'הזמנה חדשה אחת מחכה לך' : `${orders.new} הזמנות חדשות מחכות לך`}
          </h2>
          <p className="mt-1 text-sm text-ink-600">{orders.preparing > 0 ? `ועוד ${orders.preparing} בהכנה.` : 'הזמנות ששולמו מופיעות בעמוד ההזמנות מיד.'}</p>
          <a href={sectionHref('orders')} className="mt-4 inline-flex h-10 items-center rounded-full bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700">
            לעמוד ההזמנות
          </a>
        </section>
      )}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-ink-200 sm:p-6">
        <h2 className="text-lg font-bold text-ink-900">{isDraft ? 'יש שינויים שעדיין לא פורסמו' : 'כל השינויים פורסמו'}</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">
          {isDraft
            ? 'השינויים נשמרים אוטומטית בשרת כטיוטה, והגולשים עדיין רואים את הגרסה הקודמת. לוחצים "פרסום" כשהכול מוכן.'
            : 'האתר שהגולשים רואים זהה למה שכאן. כל שינוי יישמר כטיוטה עד הפרסום הבא.'}
        </p>
        {publishedAt && (
          <p className="mt-3 text-sm text-ink-600">
            פרסום אחרון: {dateTime(publishedAt)}
            {publishedBy && <> · {publishedBy}</>}
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-ink-200 sm:p-6">
        <h2 className="text-lg font-bold text-ink-900">פרטים שהחוק מחייב</h2>
        {missing.length === 0 ? (
          <p className="mt-2 flex items-center gap-2 text-[0.9375rem] font-semibold text-lagoon-700">
            <Check aria-hidden="true" className="size-5" />
            כל הפרטים מולאו. מומלץ שעורך/ת דין יעברו על העמודים המשפטיים לפני העלייה לאוויר.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              עד שימולאו, האתר מציג במקומם סימון צהוב "יש להשלים". לוחצים על פרט כדי למלא אותו.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {missing.map((m) => (
                <li key={m.field}>
                  <button
                    type="button"
                    onClick={() => onFix(m.field)}
                    className="flex w-full items-center gap-2.5 rounded-xl bg-sun-100 px-3.5 py-2.5 text-start text-sm font-semibold text-ink-900 ring-1 ring-sun-500/60 transition-colors hover:bg-sun-200"
                  >
                    <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-ink-700" />
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-ink-200 sm:p-6">
        <h2 className="text-lg font-bold text-ink-900">משתמשים וסיסמאות</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">
          הוספת מנהלים, החלפת סיסמה וחסימת משתמשים נעשות במסך הניהול של השרת. כדי שמשתמש יוכל להיכנס לכאן, מסמנים לו
          "סטטוס צוות".
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/django-admin/password_change/"
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-ink-100 px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-ink-200"
          >
            <KeyRound aria-hidden="true" className="size-4" />
            החלפת הסיסמה שלי
          </a>
          <a
            href="/django-admin/auth/user/"
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-ink-100 px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-ink-200"
          >
            <Users aria-hidden="true" className="size-4" />
            ניהול משתמשים
          </a>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** The real site in a frame, scaled to fit. The panel sends it the draft as it's typed. */
function Preview({ anchor }: { anchor: string }) {
  const { content } = useEditor();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const latest = useRef(content);
  latest.current = content;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const send = useCallback((draft = latest.current) => {
    frame.current?.contentWindow?.postMessage({ type: PREVIEW_DRAFT, content: draft }, window.location.origin);
  }, []);

  // The frame says it's ready (first load, or after switching section/device): send the draft.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === PREVIEW_READY) send();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [send]);

  useEffect(() => send(content), [content, send]);

  const frameWidth = device === 'desktop' ? 1280 : 390;
  const scale = size.w ? Math.min(1, size.w / frameWidth) : 1;
  const offset = Math.max(0, (size.w - frameWidth * scale) / 2);

  return (
    <aside aria-label="תצוגה מקדימה" className="hidden min-h-0 flex-col border-s border-ink-200 bg-ink-100 xl:flex xl:w-[46%]">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-ink-200 bg-white px-4">
        <span className="text-sm font-semibold text-ink-700">תצוגה מקדימה של הטיוטה</span>
        <div role="group" aria-label="גודל מסך" className="flex rounded-full bg-ink-100 p-0.5">
          {(
            [
              ['desktop', 'מחשב', Monitor],
              ['mobile', 'נייד', Smartphone],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              aria-pressed={device === id}
              onClick={() => setDevice(id)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-600 transition-colors hover:text-ink-900 aria-pressed:bg-white aria-pressed:text-ink-900 aria-pressed:shadow-sm"
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div ref={box} className="relative min-h-0 flex-1 overflow-hidden">
        {size.w > 0 && (
          <iframe
            ref={frame}
            key={`${anchor}-${device}`}
            src={previewHref(anchor)}
            title="תצוגה מקדימה של הטיוטה"
            style={{ width: frameWidth, height: size.h / scale, right: offset, transform: `scale(${scale})`, transformOrigin: 'top right' }}
            className={`absolute top-0 bg-white ${device === 'mobile' ? 'shadow-[0_20px_50px_-24px_rgb(33_23_42/0.45)] ring-1 ring-ink-200' : ''}`}
          />
        )}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */

const SAVE_LABEL: Record<SaveState, string> = {
  saved: 'נשמר בשרת',
  pending: 'יש שינויים…',
  saving: 'שומר…',
  error: 'השמירה נכשלה',
};

function SaveIndicator({ state, isDraft }: { state: SaveState; isDraft: boolean }) {
  const dot = state === 'error' ? 'bg-brand-600' : state === 'saved' ? (isDraft ? 'bg-sun-500' : 'bg-lagoon-600') : 'bg-ink-300';
  const text = state === 'saved' ? (isDraft ? 'טיוטה, נשמרה בשרת' : 'הכול פורסם') : SAVE_LABEL[state];
  return (
    <p className={`flex items-center gap-1.5 text-xs ${state === 'error' ? 'font-semibold text-brand-700' : 'text-ink-600'}`}>
      <span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />
      {text}
    </p>
  );
}

function Workspace({ username, onSignOut }: { username: string; onSignOut: () => void }) {
  const editor = useEditor();
  const [section, setSection] = useState<SectionId>(sectionFromPath);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [confirm, setConfirm] = useState<'publish' | 'discard' | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusField, setFocusField] = useState<string | null>(null);
  const orders = useOrdersSummary();
  const importRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return onLocationChange(() => setSection(sectionFromPath()));
  }, []);

  useEffect(() => {
    formRef.current?.scrollTo({ top: 0 });
    setConfirm(null);
  }, [section]);

  // From the overview's checklist: open the field that needs filling.
  useEffect(() => {
    if (!focusField || section !== 'business') return;
    const el = document.getElementById(`field-${focusField}`);
    el?.scrollIntoView({ block: 'center' });
    el?.focus({ preventScroll: true });
    setFocusField(null);
  }, [focusField, section]);

  useEffect(() => {
    if (message?.tone !== 'ok') return;
    const t = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [message]);

  const current = SECTIONS.find((s) => s.id === section)!;
  const firstCategory = editor.content.catalog.categories[0]?.id;
  const previewTarget = section === 'catalog' && firstCategory ? `/category/${firstCategory}` : current.preview;
  const Editor = EDITORS[section];

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setConfirm(null);
    try {
      await action();
      setMessage({ text: success, tone: 'ok' });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : String(e), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const next = normalize(JSON.parse(await file.text()));
      if (!next) throw new Error();
      editor.replace(next);
      setMessage({ text: 'הגיבוי נטען כטיוטה. בודקים בתצוגה המקדימה ומפרסמים.', tone: 'ok' });
    } catch {
      setMessage({ text: 'הקובץ שנבחר אינו קובץ גיבוי של האתר.', tone: 'error' });
    }
    if (importRef.current) importRef.current.value = '';
  };

  const signOut = async () => {
    setBusy(true);
    await editor.flush().catch(() => undefined);
    await api('/api/auth/logout/', { method: 'POST' }).catch(() => undefined);
    onSignOut();
  };

  const textButton =
    'inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-40';

  const confirmBar = (question: string, yes: string, onYes: () => void) => (
    <span className="flex items-center gap-1 rounded-full bg-brand-50 py-1 pe-1 ps-4 text-sm font-semibold text-brand-800 ring-1 ring-brand-200">
      {question}
      <button type="button" onClick={onYes} className="h-8 rounded-full bg-brand-600 px-3.5 text-white hover:bg-brand-700">
        {yes}
      </button>
      <button type="button" onClick={() => setConfirm(null)} className="h-8 rounded-full px-3 hover:bg-brand-100">
        לא
      </button>
    </span>
  );

  return (
    <div className="flex h-dvh flex-col bg-ink-50 text-ink-900">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink-200 bg-white px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <a href="/" className="rounded-full" aria-label="חזרה לאתר">
            <Logo compact alt="" className="size-10" />
          </a>
          <div className="leading-tight">
            <h1 className="font-display text-lg font-bold">ניהול האתר</h1>
            <div aria-live="polite">
              <SaveIndicator state={editor.saveState} isDraft={editor.isDraft} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {confirm === 'discard' ? (
            confirmBar('לחזור לגרסה המפורסמת ולמחוק את הטיוטה?', 'כן, למחוק', () =>
              run(editor.discard, 'הטיוטה נמחקה. מוצגת הגרסה המפורסמת.'),
            )
          ) : confirm === 'publish' ? (
            confirmBar('לפרסם את השינויים לכל הגולשים?', 'כן, לפרסם', () => run(editor.publish, 'פורסם! הגולשים רואים עכשיו את הגרסה החדשה.'))
          ) : (
            <>
              <button type="button" className={textButton} disabled={!editor.isDraft || busy} onClick={() => setConfirm('discard')}>
                <Undo2 aria-hidden="true" className="size-4" />
                ביטול השינויים
              </button>
              <button type="button" className={textButton} onClick={() => downloadContent(editor.content)}>
                <Download aria-hidden="true" className="size-4" />
                גיבוי
              </button>
              <button type="button" className={textButton} onClick={() => importRef.current?.click()}>
                <Upload aria-hidden="true" className="size-4" />
                שחזור מגיבוי
              </button>
              <a href={siteHref('/')} target="_blank" rel="noopener" className={textButton}>
                <ExternalLink aria-hidden="true" className="size-4" />
                צפייה באתר
              </a>
              <button
                type="button"
                disabled={!editor.isDraft || busy}
                onClick={() => setConfirm('publish')}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-500"
              >
                <Rocket aria-hidden="true" className="size-4" />
                {busy ? 'רגע…' : 'פרסום'}
              </button>
            </>
          )}
          <input ref={importRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => onImport(e.target.files?.[0])} />
          <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-ink-200 sm:block" />
          <button type="button" className={textButton} onClick={signOut} disabled={busy}>
            <LogOut aria-hidden="true" className="size-4" />
            יציאה
            <span className="font-normal text-ink-500" dir="ltr">
              ({username})
            </span>
          </button>
        </div>
      </header>

      {(message || editor.saveError) && (
        <p
          role={message?.tone === 'error' || editor.saveError ? 'alert' : 'status'}
          className={`shrink-0 px-4 py-2.5 text-center text-sm font-semibold sm:px-6 ${
            message?.tone === 'error' || (!message && editor.saveError) ? 'bg-brand-50 text-brand-800' : 'bg-lagoon-300/30 text-ink-900'
          }`}
        >
          {message?.text ?? editor.saveError}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav aria-label="חלקי האתר" className="shrink-0 border-b border-ink-200 bg-white lg:w-56 lg:border-b-0 lg:border-e">
          <ul className="scrollbar-hide flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible lg:p-3">
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const active = id === section;
              return (
                <li key={id} className="shrink-0">
                  <a
                    href={sectionHref(id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex h-10 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors ${
                      active ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900'
                    }`}
                  >
                    <Icon className={`size-[1.125rem] shrink-0 ${active ? 'text-brand-600' : 'text-ink-500'}`} />
                    {label}
                    {id === 'orders' && orders && orders.new > 0 && (
                      <span className="ms-auto rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                        {orders.new}
                        <span className="sr-only"> חדשות</span>
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div ref={formRef} data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto">
          <div className={`mx-auto flex flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 ${section === 'orders' ? 'max-w-5xl' : 'max-w-3xl'}`}>
            <div>
              <h2 className="font-display text-2xl font-bold">{current.label}</h2>
              <p className="mt-1 text-ink-600">{current.intro}</p>
            </div>
            {Editor ? (
              <Editor />
            ) : (
              <Overview
                orders={orders}
                onFix={(field) => {
                  setFocusField(field);
                  navigate(sectionHref('business'));
                }}
              />
            )}
          </div>
        </div>

        {previewTarget && <Preview anchor={previewTarget} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Phase = { name: 'checking' } | { name: 'signed-out'; notice?: string } | { name: 'ready'; username: string; data: ServerContent } | { name: 'error'; message: string };

/** Sign-in gate: the editor only loads for a signed-in staff user. */
export default function AdminPanel() {
  const [phase, setPhase] = useState<Phase>({ name: 'checking' });

  const load = useCallback(async (username: string) => {
    try {
      setPhase({ name: 'ready', username, data: await api<ServerContent>('/api/admin/content/') });
    } catch (e) {
      setPhase(
        e instanceof ApiError && e.status === 401
          ? { name: 'signed-out' }
          : { name: 'error', message: e instanceof Error ? e.message : String(e) },
      );
    }
  }, []);

  const check = useCallback(() => {
    setPhase({ name: 'checking' });
    api<Session>('/api/auth/session/')
      .then((s) => (s.authenticated && s.username ? load(s.username) : setPhase({ name: 'signed-out' })))
      .catch(() =>
        setPhase({ name: 'error', message: 'אין חיבור לשרת הניהול. אם האתר רץ במחשב שלכם, בודקים ששרת Django פועל.' }),
      );
  }, [load]);

  useEffect(check, [check]);

  switch (phase.name) {
    case 'checking':
      return <p className="flex min-h-dvh items-center justify-center bg-ink-50 text-ink-600">טוען…</p>;
    case 'signed-out':
      return <LoginScreen notice={phase.notice} onSignedIn={(s) => s.username && load(s.username)} />;
    case 'error':
      return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink-50 px-4 text-center">
          <p role="alert" className="max-w-md font-semibold text-ink-900">
            {phase.message}
          </p>
          <button type="button" onClick={check} className="h-11 rounded-full bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">
            ניסיון נוסף
          </button>
        </main>
      );
    case 'ready':
      return (
        <AdminProvider
          initial={phase.data}
          onSignedOut={() => setPhase({ name: 'signed-out', notice: 'החיבור פג. מתחברים שוב כדי להמשיך. שינויים מהשניות האחרונות שלא נשמרו עלולים לא להופיע.' })}
        >
          <Workspace username={phase.username} onSignOut={() => setPhase({ name: 'signed-out' })} />
        </AdminProvider>
      );
  }
}
