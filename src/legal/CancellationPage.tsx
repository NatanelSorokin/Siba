import { CheckCircle2, Send } from 'lucide-react';
import { type FormEvent, useId, useRef, useState } from 'react';
import { business } from './business';
import LegalLayout, { Clause } from './LegalLayout';
import { Missing, req } from './Missing';

const b = business;

type Field = 'fullName' | 'phone' | 'email' | 'orderNumber' | 'reason';
type Errors = Partial<Record<Field, string>>;

const fieldClass =
  'h-12 w-full rounded-xl border border-ink-300 bg-white px-4 text-base text-ink-900 transition-[border-color,box-shadow] placeholder:text-ink-500 hover:border-ink-400 focus:border-brand-500 focus:shadow-[0_0_0_4px_var(--color-brand-100)] focus:outline-none aria-invalid:border-brand-700';

function validate(data: Record<Field, string>): Errors {
  const errors: Errors = {};
  if (data.fullName.trim().length < 2) errors.fullName = 'נא למלא שם מלא';
  if (!/^0\d{1,2}-?\d{7}$/.test(data.phone.replace(/\s/g, ''))) errors.phone = 'נא למלא מספר טלפון ישראלי, למשל 050-1234567';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'כתובת הדוא"ל אינה תקינה';
  if (!data.orderNumber.trim()) errors.orderNumber = 'נא למלא את מספר ההזמנה, כפי שמופיע באישור ההזמנה';
  return errors;
}

/**
 * Online cancellation notice (Consumer Protection Law: a dedicated cancellation
 * link on the site). With no backend yet, submitting composes an email to the
 * business with every detail filled in, so the request still reaches it.
 * Replace `submitCancellation` with an API call once a backend exists.
 */
function submitCancellation(data: Record<Field, string>) {
  const body = [
    'הודעה על ביטול עסקה',
    '',
    `שם מלא: ${data.fullName}`,
    `טלפון: ${data.phone}`,
    `דוא"ל: ${data.email || '-'}`,
    `מספר הזמנה: ${data.orderNumber}`,
    `סיבת הביטול: ${data.reason || '-'}`,
  ].join('\n');
  const href = `mailto:${b.email}?subject=${encodeURIComponent(`ביטול עסקה - הזמנה ${data.orderNumber}`)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

function CancellationForm() {
  const uid = useId();
  const id = (f: Field) => `${uid}-${f}`;
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(
      (['fullName', 'phone', 'email', 'orderNumber', 'reason'] as Field[]).map((f) => [f, String(fd.get(f) ?? '')]),
    ) as Record<Field, string>;
    const found = validate(data);
    setErrors(found);
    const first = Object.keys(found)[0] as Field | undefined;
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id(first))}`)?.focus();
      return;
    }
    if (!b.email) return; // business email not configured yet; the notice below explains
    submitCancellation(data);
    setSent(true);
  };

  if (sent) {
    return (
      <div role="status" className="flex gap-3 rounded-2xl bg-lagoon-300/25 p-5 text-ink-900 ring-1 ring-lagoon-600/30">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-lagoon-700" />
        <div>
          <p className="font-semibold">הודעת הביטול נפתחה בתוכנת הדוא"ל שלכם</p>
          <p className="mt-1">
            שלחו את ההודעה כדי להשלים את הביטול. אם תוכנת הדוא"ל לא נפתחה, אפשר לבטל גם בטלפון{' '}
            <a href={`tel:${b.phoneHref}`} dir="ltr">
              {b.phone}
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const label = (f: Field, text: string, required: boolean) => (
    <label htmlFor={id(f)} className="mb-1.5 block font-semibold text-ink-900">
      {text}
      {required ? <span className="text-brand-700"> *</span> : <span className="font-normal text-ink-600"> (רשות)</span>}
    </label>
  );
  const error = (f: Field) =>
    errors[f] ? (
      <p id={`${id(f)}-error`} className="mt-1.5 text-sm font-medium text-brand-700">
        {errors[f]}
      </p>
    ) : null;
  const a11y = (f: Field) => ({
    id: id(f),
    name: f,
    'aria-invalid': errors[f] ? true : undefined,
    'aria-describedby': errors[f] ? `${id(f)}-error` : undefined,
  });

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="rounded-3xl bg-white p-5 ring-1 ring-ink-200 sm:p-7">
      <p className="mb-5 text-sm text-ink-600">
        שדות המסומנים ב-<span className="text-brand-700">*</span> הם שדות חובה.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          {label('fullName', 'שם מלא', true)}
          <input {...a11y('fullName')} type="text" autoComplete="name" required className={fieldClass} />
          {error('fullName')}
        </div>
        <div>
          {label('phone', 'טלפון', true)}
          <input {...a11y('phone')} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required className={`${fieldClass} text-right`} />
          {error('phone')}
        </div>
        <div>
          {label('email', 'דוא"ל', false)}
          <input {...a11y('email')} type="email" autoComplete="email" dir="ltr" className={`${fieldClass} text-right`} />
          {error('email')}
        </div>
        <div className="sm:col-span-2">
          {label('orderNumber', 'מספר הזמנה', true)}
          <input {...a11y('orderNumber')} type="text" required className={fieldClass} />
          {error('orderNumber')}
        </div>
        <div className="sm:col-span-2">
          {label('reason', 'סיבת הביטול', false)}
          <textarea {...a11y('reason')} rows={3} className={`${fieldClass} h-auto py-3`} />
        </div>
      </div>

      {/* Privacy notice at the point of collection (Privacy Protection Law §11) */}
      <p className="mt-5 text-sm leading-relaxed text-ink-600">
        הפרטים ישמשו רק לטיפול בבקשת הביטול ובהחזר הכספי, ויישמרו כנדרש לפי דין. אין חובה חוקית למסור אותם, אך בלעדיהם לא
        נוכל לזהות את ההזמנה. אפשר לעיין בפרטים ולבקש לתקן אותם. פרטים נוספים ב<a href="#/privacy">מדיניות הפרטיות</a>.
      </p>

      {!b.email && (
        <p className="mt-4 text-sm">
          <Missing label='כתובת הדוא"ל של העסק, שאליה יישלחו בקשות הביטול' />
        </p>
      )}

      <button
        type="submit"
        className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-7 font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-brand-700 active:scale-[0.98]"
      >
        <Send aria-hidden="true" className="size-5" />
        שליחת הודעת ביטול
      </button>
    </form>
  );
}

export default function CancellationPage() {
  return (
    <LegalLayout
      title="ביטול עסקה והחזרות"
      updated={b.updated.cancellation}
      intro={
        <p>
          אפשר לבטל עסקה שנעשתה באתר או בטלפון, בהתאם לחוק הגנת הצרכן, התשמ"א-1981, ולתקנות הגנת הצרכן (ביטול עסקה),
          התשע"א-2010. <a href="#cancel-form" className="font-semibold text-brand-700 underline underline-offset-4">לטופס הביטול המקוון</a>
        </p>
      }
    >
      <Clause title="עד מתי אפשר לבטל">
        <ul>
          <li>
            מיום ביצוע ההזמנה ועד <strong>14 ימים</strong> מיום קבלת המוצר, או מיום קבלת המסמך עם פרטי העסקה, לפי המאוחר
            מביניהם.
          </li>
          <li>
            <strong>אזרחים ותיקים (בני 65 ומעלה), אנשים עם מוגבלות ועולים חדשים</strong> (עד חמש שנים מקבלת מעמד עולה)
            יכולים לבטל עד <strong>4 חודשים</strong> מיום ביצוע העסקה, מיום קבלת המוצר או מיום קבלת המסמך, לפי המאוחר, אם העסקה כללה שיחה עם נציג, לרבות שיחה בתקשורת
            אלקטרונית. בעת הביטול יש להציג תעודה מתאימה.
          </li>
        </ul>
      </Clause>

      <Clause title="דמי ביטול והחזר כספי">
        <ul>
          <li>
            בביטול שלא בגלל פגם במוצר, ייגבו דמי ביטול בשיעור <strong>5% ממחיר המוצר או 100 ₪, הנמוך מביניהם</strong>.
          </li>
          <li>
            <strong>לא ייגבו דמי ביטול</strong> אם הביטול נובע מפגם במוצר, מאי התאמה בין המוצר לתיאור, מאי אספקה במועד או
            מהפרה אחרת של תנאי העסקה.
          </li>
          <li>
            ההחזר הכספי יבוצע תוך <strong>14 ימים</strong> מיום קבלת הודעת הביטול, באמצעי התשלום שבו שילמתם. בתשלום בכרטיס
            אשראי, החיוב יבוטל.
          </li>
        </ul>
      </Clause>

      <Clause title="החזרת המוצר">
        <p>
          יש להחזיר את המוצר במצב שבו התקבל, ללא שימוש, ורצוי באריזתו המקורית. אפשר להחזיר אותו לחנות בכתובת{' '}
          {req(b.address, 'כתובת העסק')}, או לתאם איסוף בטלפון.
        </p>
      </Clause>

      <Clause title="מוצרים שלא ניתן לבטל את רכישתם">
        <ul>
          <li>מוצרי מזון, כמו ממתקים וחומרי גלם לאפייה.</li>
          <li>מוצרים שהוכנו במיוחד עבורכם לפי דרישה אישית, כמו בלון מספר בהתאמה אישית.</li>
        </ul>
        <p>אם מוצר כזה הגיע פגום או שונה מהותית מהתיאור, תוכלו כמובן לבטל ולקבל החזר מלא.</p>
      </Clause>

      <Clause title="איך מבטלים">
        <p>אפשר למסור הודעת ביטול בכל אחת מהדרכים האלה:</p>
        <ul>
          <li>בטופס המקוון שבעמוד זה.</li>
          <li>
            בטלפון{' '}
            <a href={`tel:${b.phoneHref}`} dir="ltr">
              {b.phone}
            </a>
            , בשעות הפעילות.
          </li>
          <li>בדוא"ל: {b.email ? <a href={`mailto:${b.email}`}>{b.email}</a> : req('', 'דוא"ל לפניות')}</li>
          <li>בדואר רשום לכתובת: {req(b.address, 'כתובת העסק')}</li>
        </ul>
        <p>בהודעה יש לציין שם מלא, מספר טלפון ומספר הזמנה.</p>
      </Clause>

      <Clause id="cancel-form" title="טופס ביטול עסקה מקוון">
        <CancellationForm />
      </Clause>
    </LegalLayout>
  );
}
