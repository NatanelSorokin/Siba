import { AlertTriangle, Check } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { api } from '../api';
import { BLANK_PRODUCT } from '../content/store';
import { useEditor } from './adminStore';
import type { Link, Product, SiteContent, Tier, TierTone } from '../content/types';
import { instagramHandle } from '../legal/business';
import { CardList, Group, ImageField, inputClass, RowInput, RowList, Select, TextField, Toggle } from './fields';

type Update = (recipe: (draft: SiteContent) => void) => void;

const linkHint = '# = עדיין אין עמוד. עמוד קטגוריה: /category/balloons. אפשר גם כתובת מלאה.';

function LinkFields({ label, link, onChange }: { label: string; link: Link; onChange: (l: Link) => void }) {
  return (
    <>
      <TextField label={`${label}: טקסט`} value={link.label} onChange={(v) => onChange({ ...link, label: v })} />
      <TextField label={`${label}: קישור`} value={link.href} ltr onChange={(v) => onChange({ ...link, href: v })} hint={linkHint} />
    </>
  );
}

/* ------------------------------------------------------------------ */

export function BusinessSection() {
  const { content, update } = useEditor();
  const b = content.business;
  const set: Update = update;

  return (
    <>
      <Group title="פרטים מזהים" description='חוק הגנת הצרכן מחייב להציג באתר את שם העסק, מספר הח.פ. והכתובת. הם מוצגים בכותרת התחתונה ובתקנון.'>
        <TextField label="שם העסק (כפי שמופיע באתר)" value={b.tradeName} onChange={(v) => set((d) => void (d.business.tradeName = v))} />
        <TextField label="שם רשום (כפי שמופיע ברשם החברות)" value={b.legalName} onChange={(v) => set((d) => void (d.business.legalName = v))} />
        <TextField label="ח.פ. / ע.מ." fieldId="companyId" required ltr value={b.companyId} onChange={(v) => set((d) => void (d.business.companyId = v))} />
        <TextField label="דומיין האתר" ltr value={b.domain} onChange={(v) => set((d) => void (d.business.domain = v))} />
        <TextField label="כתובת העסק" fieldId="address" required wide value={b.address} placeholder="רחוב, מספר, עיר" onChange={(v) => set((d) => void (d.business.address = v))} />
      </Group>

      <Group title="יצירת קשר">
        <TextField label="טלפון" type="tel" ltr value={b.phone} onChange={(v) => set((d) => void (d.business.phone = v))} hint="מוצג בראש האתר, בכותרת התחתונה ובעמודים המשפטיים." />
        <TextField
          label="אינסטגרם"
          ltr
          value={b.instagram}
          placeholder="siba.lmesiba"
          onChange={(v) => set((d) => void (d.business.instagram = instagramHandle(v)))}
          hint="שם המשתמש, בלי @ (אפשר גם להדביק קישור לפרופיל). ריק = לא מוצג. מוצג כקישור בלבד, בלי תוכן מוטמע מאינסטגרם."
        />
        <TextField label='דוא"ל לפניות' fieldId="email" type="email" required ltr value={b.email} onChange={(v) => set((d) => void (d.business.email = v))} hint="לכתובת הזו נשלחים גם טפסי ביטול העסקה." />
        <RowList
          label="שעות פעילות"
          itemName="שורה"
          items={b.hours}
          create={() => ({ days: '', time: '' })}
          onChange={(rows) => set((d) => void (d.business.hours = rows))}
          render={(row, put, i) => (
            <>
              <RowInput label={`ימים, שורה ${i + 1}`} placeholder="ימים א'-ה'" value={row.days} onChange={(v) => put({ ...row, days: v })} />
              <RowInput label={`שעות, שורה ${i + 1}`} placeholder="08:30 - 20:00" value={row.time} onChange={(v) => put({ ...row, time: v })} />
            </>
          )}
        />
        <RowList
          label="אמצעי תשלום"
          hint="מופיעים בתקנון."
          itemName="אמצעי תשלום"
          items={b.paymentMethods}
          create={() => ''}
          onChange={(rows) => set((d) => void (d.business.paymentMethods = rows))}
          render={(m, put, i) => <RowInput label={`אמצעי תשלום ${i + 1}`} value={m} onChange={put} />}
        />
      </Group>

      <Group title="נגישות" description="תקנות הנגישות מחייבות לפרסם בהצהרת הנגישות את פרטי רכז/ת הנגישות ואת הסדרי הנגישות בחנות.">
        <TextField label="שם רכז/ת הנגישות" fieldId="coordinatorName" required value={b.accessibilityCoordinator.name} onChange={(v) => set((d) => void (d.business.accessibilityCoordinator.name = v))} />
        <TextField label="טלפון רכז/ת הנגישות" fieldId="coordinatorPhone" required type="tel" ltr value={b.accessibilityCoordinator.phone} onChange={(v) => set((d) => void (d.business.accessibilityCoordinator.phone = v))} />
        <TextField label='דוא"ל רכז/ת הנגישות' fieldId="coordinatorEmail" required type="email" ltr wide value={b.accessibilityCoordinator.email} onChange={(v) => set((d) => void (d.business.accessibilityCoordinator.email = v))} />
        <TextField
          label="הסדרי הנגישות בחנות"
          fieldId="storeAccessibility"
          required
          multiline
          value={b.storeAccessibility}
          placeholder="חניית נכים מול הכניסה, כניסה ללא מדרגות, דלפק שירות מונמך…"
          onChange={(v) => set((d) => void (d.business.storeAccessibility = v))}
        />
      </Group>

      <Group title="משלוחים" description="מוצגים בעמוד מדיניות המשלוחים. חוק הגנת הצרכן מחייב לפרט את מועד האספקה ואת עלותה לפני ההזמנה.">
        <TextField label="אזורי משלוח" fieldId="shippingAreas" required wide value={b.shipping.areas} placeholder="משלוח עד הבית לכל הארץ, למעט אילת" onChange={(v) => set((d) => void (d.business.shipping.areas = v))} />
        <TextField label="זמני אספקה" fieldId="shippingTime" required value={b.shipping.deliveryTime} placeholder="עד 5 ימי עסקים" onChange={(v) => set((d) => void (d.business.shipping.deliveryTime = v))} />
        <TextField label="עלות משלוח" fieldId="shippingCost" required value={b.shipping.cost} placeholder="29.90 ₪, חינם בהזמנה מעל 299 ₪" onChange={(v) => set((d) => void (d.business.shipping.cost = v))} />
        <TextField label="איסוף עצמי" wide value={b.shipping.pickup} placeholder="ריק = לא מוצג" onChange={(v) => set((d) => void (d.business.shipping.pickup = v))} />
      </Group>

      <Group title="תאריכי עדכון של המסמכים" description='מוצגים בראש כל עמוד משפטי ("עודכן לאחרונה"). מעדכנים אחרי כל שינוי בתוכן המסמך.'>
        {(
          [
            ['terms', 'תקנון'],
            ['privacy', 'מדיניות פרטיות'],
            ['cancellation', 'ביטול עסקה'],
            ['shipping', 'משלוחים'],
            ['accessibility', 'הצהרת נגישות'],
          ] as const
        ).map(([key, label]) => (
          <TextField key={key} label={label} type="date" value={b.updated[key]} onChange={(v) => set((d) => void (d.business.updated[key] = v))} />
        ))}
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

/** Lowercase English letters, digits and dashes: what a page address may contain. */
const slug = (v: string) =>
  v
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .slice(0, 40);

const digits = (v: string) => v.replace(/[^\d.]/g, '');

function unusedId(prefix: string, taken: string[]) {
  let n = taken.length + 1;
  while (taken.includes(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

/**
 * A product's stock. Saved straight to the server when the field is left (not to the
 * draft): it changes the live site at once, and paid orders lower it on the server.
 */
function StockField({ productId, value, onSaved }: { productId: string; value: number | undefined; onSaved: (q: number | null) => void }) {
  const id = useId();
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  useEffect(() => setText(value === undefined ? '' : String(value)), [value]);

  const save = async () => {
    const q = text.trim() === '' ? null : Number(text);
    if (q === (value ?? null)) return;
    setState('saving');
    try {
      await api(`/api/admin/stock/${encodeURIComponent(productId)}/`, { method: 'POST', json: { quantity: q } });
      onSaved(q);
      setState('saved');
    } catch (e) {
      setState('error');
      setMessage(e instanceof Error ? e.message : 'השמירה נכשלה.');
    }
  };

  const n = text.trim() === '' ? null : Number(text);
  const hint =
    state === 'saving'
      ? 'שומר…'
      : state === 'error'
        ? message
        : n === null
          ? 'ריק = בלי ספירת מלאי. 0 = אזל מהמלאי.'
          : n === 0
            ? 'אזל מהמלאי: כך מוצג באתר, ואי אפשר להזמין.'
            : `${state === 'saved' ? 'נשמר, ומעודכן באתר מיד. ' : ''}יורד אוטומטית עם כל הזמנה ששולמה.`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink-900">
        מלאי (יחידות)
        {n === 0 && <span className="rounded-full bg-brand-50 px-2 py-px text-xs font-semibold text-brand-800">אזל</span>}
      </label>
      <input
        id={id}
        inputMode="numeric"
        dir="ltr"
        maxLength={5}
        value={text}
        placeholder="ללא ספירה"
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          setText(e.target.value.replace(/\D/g, ''));
          setState('idle');
        }}
        onBlur={() => void save()}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={`${inputClass} h-11 text-right`}
      />
      <p id={`${id}-hint`} role={state === 'error' ? 'alert' : undefined} className={`mt-1.5 text-sm ${state === 'error' ? 'font-semibold text-brand-800' : 'text-ink-600'}`}>
        {hint}
      </p>
    </div>
  );
}

export function CatalogSection() {
  const { content, update } = useEditor();
  const { categories, products } = content.catalog;
  const [filter, setFilter] = useState(categories[0]?.id ?? '');
  const shown = categories.some((c) => c.id === filter) ? filter : (categories[0]?.id ?? '');
  const visible = products.filter((p) => p.categoryId === shown);
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name || c.id }));
  const ids = categories.map((c) => c.id);
  const duplicate = ids.find((id, i) => ids.indexOf(id) !== i);
  const [stock, setStock] = useState<Record<string, number>>({});

  useEffect(() => {
    const ctrl = new AbortController();
    api<{ stock: Record<string, number> }>('/api/admin/stock/', { signal: ctrl.signal })
      .then((d) => setStock(d.stock))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  return (
    <>
      <Group title="קטגוריות" description="כל קטגוריה מופיעה בתפריט שבראש האתר, לפי הסדר כאן, ומקבלת עמוד משלה עם המוצרים שלה.">
        <div className="sm:col-span-2">
          <CardList
            items={categories}
            itemName="קטגוריה"
            title={(c) => c.name}
            create={() => ({ id: unusedId('category', ids), name: '', description: '' })}
            onChange={(items) => update((d) => void (d.catalog.categories = items))}
            render={(c, patch) => (
              <>
                <TextField label="שם בתפריט" value={c.name} onChange={(v) => patch({ name: v })} />
                <TextField
                  label="כתובת העמוד"
                  ltr
                  value={c.id}
                  onChange={(v) => patch({ id: slug(v) })}
                  hint={`/category/${c.id || '…'} · באנגלית בלבד. שינוי הכתובת שובר קישורים ישנים אליה.`}
                />
                <TextField label="תיאור קצר (לא חובה)" multiline value={c.description} onChange={(v) => patch({ description: v })} />
              </>
            )}
          />
          {duplicate && (
            <p role="alert" className="mt-3 rounded-xl bg-sun-100 p-3 text-sm text-ink-900 ring-1 ring-sun-500">
              הכתובת "{duplicate}" משמשת שתי קטגוריות. לכל קטגוריה צריך כתובת משלה, אחרת השינויים לא יישמרו.
            </p>
          )}
        </div>
      </Group>

      <Group title="מוצרים" description="מוצר מוצג באתר רק כשיש לו מחיר. המלאי נשמר מיד (בלי פרסום) ויורד עם כל הזמנה ששולמה; כשהוא מגיע ל-0 המוצר מוצג כ&quot;אזל מהמלאי&quot;.">
        {categories.length === 0 ? (
          <p className="text-sm text-ink-600 sm:col-span-2">קודם מוסיפים קטגוריה.</p>
        ) : (
          <>
            <Select label="קטגוריה" value={shown} options={categoryOptions} onChange={setFilter} />
            <div className="sm:col-span-2">
              <CardList
                items={visible}
                itemName="מוצר"
                title={(p) => p.name}
                create={(): Product => ({ ...BLANK_PRODUCT, id: `p-${Date.now().toString(36)}`, categoryId: shown })}
                onChange={(items) =>
                  update((d) => void (d.catalog.products = [...d.catalog.products.filter((p) => p.categoryId !== shown), ...items]))
                }
                render={(p, patch) => {
                  const price = Number(p.price);
                  const old = Number(p.oldPrice);
                  const off = old > price && price > 0 ? Math.floor((1 - price / old) * 100) : null;
                  return (
                    <>
                      <TextField label="שם המוצר" value={p.name} onChange={(v) => patch({ name: v })} />
                      <Select label="קטגוריה" value={p.categoryId} options={categoryOptions} onChange={(v) => patch({ categoryId: v })} />
                      <TextField
                        label="מחיר (₪, כולל מע״מ)"
                        ltr
                        value={p.price}
                        onChange={(v) => patch({ price: digits(v) })}
                        hint={p.price ? undefined : 'בלי מחיר המוצר לא מוצג באתר.'}
                      />
                      <TextField
                        label="מחיר לפני הנחה (₪)"
                        ltr
                        value={p.oldPrice}
                        onChange={(v) => patch({ oldPrice: digits(v) })}
                        hint={off !== null ? `חיסכון של ${off}%. המחיר המחוק חייב להיות מחיר שבו המוצר נמכר בפועל.` : 'ריק = בלי מחיר מחוק.'}
                      />
                      <TextField label="תיאור" multiline value={p.description} onChange={(v) => patch({ description: v })} />
                      <ImageField label="תמונה" value={p.image} onChange={(v) => patch({ image: v })} />
                      <StockField
                        productId={p.id}
                        value={stock[p.id]}
                        onSaved={(q) =>
                          setStock((prev) => {
                            const next = { ...prev };
                            if (q === null) delete next[p.id];
                            else next[p.id] = q;
                            return next;
                          })
                        }
                      />
                    </>
                  );
                }}
              />
            </div>
          </>
        )}
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

type PaymentsStatus = { configured: boolean; siteUrl: boolean; documents: boolean; ready: boolean };

export function CheckoutSection() {
  const { content, update } = useEditor();
  const c = content.checkout;
  const [status, setStatus] = useState<PaymentsStatus | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api<PaymentsStatus>('/api/admin/payments/', { signal: ctrl.signal })
      .then(setStatus)
      .catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  return (
    <>
      <Group title="תשלום באתר (Cardcom)">
        <div className="sm:col-span-2">
          {!status ? (
            <p className="text-sm text-ink-600">בודק…</p>
          ) : status.ready ? (
            <p className="flex items-center gap-2 font-semibold text-lagoon-700">
              <Check aria-hidden="true" className="size-5" />
              התשלום באתר מחובר. הלקוחות משלמים בעמוד המאובטח של Cardcom.
            </p>
          ) : (
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-ink-700">
              <p className="font-semibold text-ink-900">התשלום באתר עוד לא מחובר, ולכן הלקוחות מתבקשים להזמין בטלפון.</p>
              <p>
                כדי לחבר: פותחים חשבון סליקה ב-Cardcom ומקבלים מספר מסוף ושם API. את שניהם מגדירים בשרת עצמו (ולא כאן, כדי שלא
                ייחשפו), לפי ההוראות בקובץ backend/README.md.
              </p>
              {!status.siteUrl && <p>חסרה גם כתובת האתר (SITE_URL) בהגדרות השרת.</p>}
            </div>
          )}
          {status?.ready && (
            <p className="mt-2 text-sm text-ink-600">
              {status.documents
                ? 'Cardcom מפיקה קבלה לכל תשלום ושולחת אותה ללקוח במייל.'
                : 'קבלות לא מופקות אוטומטית דרך Cardcom (אפשר להפעיל בהגדרות השרת).'}
            </p>
          )}
        </div>
      </Group>

      <Group title="משלוח ואיסוף" description="מה שמסומן כאן מוצע ללקוח בעמוד התשלום. דמי המשלוח מתווספים לסכום.">
        <Toggle label="משלוח עד הבית" checked={c.deliveryEnabled} onChange={(v) => update((d) => void (d.checkout.deliveryEnabled = v))} />
        {c.deliveryEnabled && (
          <TextField
            label="דמי משלוח (₪, כולל מע״מ)"
            ltr
            value={c.deliveryFee}
            onChange={(v) => update((d) => void (d.checkout.deliveryFee = digits(v)))}
            hint={c.deliveryFee ? (Number(c.deliveryFee) === 0 ? 'משלוח חינם.' : undefined) : 'כל עוד ריק, משלוח לא מוצע. 0 = חינם.'}
          />
        )}
        <Toggle
          label="איסוף עצמי מהחנות"
          hint={content.business.address ? `מוצג עם הכתובת: ${content.business.address}` : 'מומלץ למלא את כתובת העסק בפרטי העסק.'}
          checked={c.pickupEnabled}
          onChange={(v) => update((d) => void (d.checkout.pickupEnabled = v))}
        />
      </Group>

      <Group title="תשלומים" description="כמה תשלומים הלקוח יכול לבחור בעמוד התשלום. חלוקה לתשלומים צריכה להיות מאושרת גם במסוף ב-Cardcom.">
        <Select
          label="מספר תשלומים מרבי"
          value={String(c.maxPayments)}
          options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: i === 0 ? 'תשלום אחד (בלי חלוקה)' : `עד ${i + 1} תשלומים` }))}
          onChange={(v) => update((d) => void (d.checkout.maxPayments = Number(v)))}
        />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function HeroSection() {
  const { content, update } = useEditor();
  const h = content.hero;
  return (
    <>
      <Group title="העיגול הוורוד" description="הדבר הראשון שגולשים רואים. כדאי לשמור על כותרת קצרה, עד שבע מילים.">
        <TextField label="שורה מעל הכותרת" value={h.eyebrow} onChange={(v) => update((d) => void (d.hero.eyebrow = v))} hint="בצהוב. ריק = לא מוצג." />
        <TextField label="כותרת" value={h.title} onChange={(v) => update((d) => void (d.hero.title = v))} />
        <TextField label="טקסט" multiline value={h.text} onChange={(v) => update((d) => void (d.hero.text = v))} />
        <LinkFields label="כפתור ראשי" link={h.primary} onChange={(l) => update((d) => void (d.hero.primary = l))} />
        <LinkFields label="כפתור משני" link={h.secondary} onChange={(l) => update((d) => void (d.hero.secondary = l))} />
        <TextField label="שורה תחתונה" wide value={h.note} onChange={(v) => update((d) => void (d.hero.note = v))} hint="ריק = לא מוצג." />
      </Group>

      <Group title="מדבקת המחיר" description="העיגול הצהוב שבפינת הבאנר.">
        <Toggle label="להציג את המדבקה" checked={h.sticker.show} onChange={(v) => update((d) => void (d.hero.sticker.show = v))} />
        <TextField label="תגית" value={h.sticker.badge} onChange={(v) => update((d) => void (d.hero.sticker.badge = v))} />
        <TextField label="מחיר (₪, כולל מע״מ)" ltr value={h.sticker.price} onChange={(v) => update((d) => void (d.hero.sticker.price = v))} />
        <TextField label="תיאור" value={h.sticker.text} onChange={(v) => update((d) => void (d.hero.sticker.text = v))} />
        <TextField label="מתחת למחיר" value={h.sticker.suffix} onChange={(v) => update((d) => void (d.hero.sticker.suffix = v))} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function CategoriesSection() {
  const { content, update } = useEditor();
  return (
    <CardList
      items={content.categories.items}
      itemName="קטגוריה"
      title={(c) => c.title}
      create={() => ({ title: '', image: '', href: '#' })}
      onChange={(items) => update((d) => void (d.categories.items = items))}
      render={(c, patch) => (
        <>
          <TextField label="שם הקטגוריה" value={c.title} onChange={(v) => patch({ title: v })} />
          <TextField label="קישור" ltr value={c.href} onChange={(v) => patch({ href: v })} hint={linkHint} />
          <ImageField label="תמונה" value={c.image} onChange={(v) => patch({ image: v })} />
        </>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */

export function ThemesSection() {
  const { content, update } = useEditor();
  const t = content.themes;
  return (
    <>
      <Group title="כותרת האזור">
        <TextField label="כותרת" value={t.title} onChange={(v) => update((d) => void (d.themes.title = v))} />
        <TextField label="תת-כותרת" value={t.subtitle} onChange={(v) => update((d) => void (d.themes.subtitle = v))} />
        <LinkFields label="קישור לכל המוצרים" link={t.allLink} onChange={(l) => update((d) => void (d.themes.allLink = l))} />
      </Group>
      <CardList
        items={t.items}
        itemName="מסיבת נושא"
        title={(c) => c.title}
        create={() => ({ title: '', subtitle: '', image: '', href: '#' })}
        onChange={(items) => update((d) => void (d.themes.items = items))}
        render={(c, patch) => (
          <>
            <TextField label="שם הנושא" value={c.title} onChange={(v) => patch({ title: v })} />
            <TextField label="תיאור קצר" value={c.subtitle} onChange={(v) => patch({ subtitle: v })} />
            <TextField label="קישור" ltr wide value={c.href} onChange={(v) => patch({ href: v })} hint={linkHint} />
            <ImageField label="תמונה" value={c.image} onChange={(v) => patch({ image: v })} />
          </>
        )}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

const toneOptions: { value: TierTone; label: string }[] = [
  { value: 'neutral', label: 'בהיר' },
  { value: 'brand', label: 'ורוד' },
  { value: 'ink', label: 'כהה' },
];

/** Whole-percent discount, rounded down so a "עד X%" claim is never overstated. */
function savings(t: Tier): number | null {
  const price = Number(t.price);
  const old = Number(t.oldPrice);
  if (!t.oldPrice || !(price > 0) || !(old > price)) return null;
  return Math.floor((1 - price / old) * 100);
}

export function PackagesSection() {
  const { content, update } = useEditor();
  const p = content.packages;
  const best = Math.max(0, ...p.tiers.map((t) => savings(t) ?? 0));
  const claimed = [...p.text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1]));
  const overclaim = claimed.find((c) => c > best);

  return (
    <>
      <Group title="כותרת האזור">
        <TextField label="כותרת" value={p.title} onChange={(v) => update((d) => void (d.packages.title = v))} />
        <TextField label="תגית צהובה" value={p.badge} onChange={(v) => update((d) => void (d.packages.badge = v))} hint="ריק = לא מוצגת." />
        <TextField label="טקסט" multiline value={p.text} onChange={(v) => update((d) => void (d.packages.text = v))} />
        {overclaim !== undefined && (
          <p role="alert" className="flex gap-2.5 rounded-xl bg-sun-100 p-3.5 text-sm leading-relaxed text-ink-900 ring-1 ring-sun-500 sm:col-span-2">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-700" />
            <span>
              הטקסט מבטיח חיסכון של {overclaim}%, אבל החיסכון הגבוה ביותר בחבילות הוא {best}%. חוק הגנת הצרכן אוסר על הבטחת
              הנחה שאינה קיימת: עדכנו את הטקסט או את המחירים.
            </span>
          </p>
        )}
        <TextField label="תווית החבילה המומלצת" wide value={p.featuredLabel} onChange={(v) => update((d) => void (d.packages.featuredLabel = v))} />
      </Group>

      <CardList
        items={p.tiers}
        itemName="חבילה"
        title={(t) => t.name}
        create={(): Tier => ({ id: `tier-${Date.now()}`, name: '', guests: '', price: '', oldPrice: '', items: [], cta: 'הוספה לסל', featured: false, tone: 'neutral' })}
        onChange={(tiers) => update((d) => void (d.packages.tiers = tiers))}
        render={(t, patch) => {
          const s = savings(t);
          return (
            <>
              <TextField label="שם החבילה" value={t.name} onChange={(v) => patch({ name: v })} />
              <TextField label="כמות חוגגים" value={t.guests} placeholder="עד 12 חוגגים" onChange={(v) => patch({ guests: v })} />
              <TextField label="מחיר (₪, כולל מע״מ)" ltr value={t.price} onChange={(v) => patch({ price: v.replace(/[^\d.]/g, '') })} />
              <TextField
                label="מחיר לפני הנחה (₪)"
                ltr
                value={t.oldPrice}
                onChange={(v) => patch({ oldPrice: v.replace(/[^\d.]/g, '') })}
                hint={s !== null ? `חיסכון של ${s}%. המחיר המחוק חייב להיות מחיר שבו החבילה נמכרה בפועל.` : 'ריק = בלי מחיר מחוק.'}
              />
              <RowList
                label="מה בחבילה"
                itemName="פריט"
                items={t.items}
                create={() => ''}
                onChange={(items) => patch({ items })}
                render={(item, put, i) => <RowInput label={`פריט ${i + 1}`} value={item} onChange={put} />}
              />
              <TextField label="טקסט הכפתור" value={t.cta} onChange={(v) => patch({ cta: v })} />
              <Select label="צבע הכרטיס" value={t.tone} options={toneOptions} onChange={(v) => patch({ tone: v })} />
              <Toggle label="חבילה מומלצת" hint="מודגשת ומקבלת את התווית שלמעלה." checked={t.featured} onChange={(v) => patch({ featured: v })} />
            </>
          );
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

export function FooterSection() {
  const { content, update } = useEditor();
  const f = content.footer;
  return (
    <Group
      title="כותרת תחתונה"
      description="שם העסק, הח.פ., הכתובת ושעות הפעילות נלקחים מפרטי העסק. הקישורים לעמודים המשפטיים קבועים, כי החוק מחייב אותם."
    >
      <TextField label="סלוגן" value={f.tagline} onChange={(v) => update((d) => void (d.footer.tagline = v))} />
      <TextField label="שורת אבטחה" value={f.secureLabel} onChange={(v) => update((d) => void (d.footer.secureLabel = v))} hint="ריק = לא מוצגת." />
      <TextField
        label="תיאור העסק"
        multiline
        value={f.description}
        onChange={(v) => update((d) => void (d.footer.description = v))}
        hint='כל טענה כאן צריכה להיות נכונה וניתנת להוכחה. למשל "היעד המוביל בישראל" היא טענה שקשה להוכיח.'
      />
    </Group>
  );
}
