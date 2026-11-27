import { ArrowDown, ArrowUp, ImageUp, Plus, Trash2, X } from 'lucide-react';
import { type ReactNode, useId, useRef, useState } from 'react';
import SmartImage from '../components/SmartImage';
import { useEditor } from './adminStore';

export const inputClass =
  'w-full rounded-xl border border-ink-300 bg-white px-3.5 text-[0.9375rem] text-ink-900 transition-[border-color,box-shadow] placeholder:text-ink-400 hover:border-ink-400 focus:border-brand-500 focus:shadow-[0_0_0_4px_var(--color-brand-100)] focus:outline-none';

const smallButton =
  'inline-flex size-9 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-30';

/** A titled group of fields: one card per topic, so a long form stays scannable. */
export function Group({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-ink-200 sm:p-6">
      <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      {description && <div className="mt-1 text-sm leading-relaxed text-ink-600">{description}</div>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  /** Required by law: an empty value is flagged. */
  required?: boolean;
  multiline?: boolean;
  /** Spans both columns of the group. */
  wide?: boolean;
  ltr?: boolean;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date';
  placeholder?: string;
  /** Lets the overview's checklist jump straight to this field. */
  fieldId?: string;
};

export function TextField({
  label,
  value,
  onChange,
  hint,
  required,
  multiline,
  wide = multiline,
  ltr,
  type = 'text',
  placeholder,
  fieldId,
}: TextFieldProps) {
  const uid = useId();
  const id = fieldId ? `field-${fieldId}` : uid;
  const missing = required && !value.trim();
  const common = {
    id,
    value,
    placeholder,
    dir: ltr ? 'ltr' : undefined,
    'aria-describedby': hint || missing ? `${id}-hint` : undefined,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    className: `${inputClass} ${ltr ? 'text-right' : ''} ${missing ? 'border-sun-500 bg-sun-100/60' : ''}`,
  };
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink-900">
        {label}
        {required && (
          <span className={`rounded-full px-2 py-px text-xs font-semibold ${missing ? 'bg-sun-300 text-ink-900' : 'bg-ink-100 text-ink-600'}`}>
            חובה לפי חוק
          </span>
        )}
      </label>
      {multiline ? (
        <textarea {...common} rows={3} className={`${common.className} py-2.5 leading-relaxed`} />
      ) : (
        <input {...common} type={type} className={`${common.className} h-11`} />
      )}
      {(hint || missing) && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-600">
          {missing ? 'עדיין לא מולא. עד שימולא, יוצג באתר סימון "יש להשלים".' : hint}
        </p>
      )}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3 sm:col-span-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-brand-600"
      />
      <label htmlFor={id} className="text-sm">
        <span className="font-semibold text-ink-900">{label}</span>
        {hint && <span className="mt-0.5 block text-ink-600">{hint}</span>}
      </label>
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-900">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={`${inputClass} h-11`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Shrinks a photo before upload (phones take 4000px+ photos); the server re-encodes it anyway. */
function shrink(file: File, maxSide = 2000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))), 'image/webp', 0.9);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('not an image'));
    };
    img.src = url;
  });
}

export function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadImage } = useEditor();
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const isUpload = value.startsWith('/media/');
  const isExternal = /^https?:\/\//.test(value);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const blob = await shrink(file).catch(() => {
        throw new Error('הקובץ שנבחר אינו תמונה. אפשר להעלות JPG, PNG או WEBP.');
      });
      onChange(await uploadImage(blob, file.name.replace(/.[^.]+$/, '') + '.webp'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="sm:col-span-2">
      <p id={`${id}-label`} className="mb-1.5 block text-sm font-semibold text-ink-900">
        {label}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-ink-100 ring-1 ring-ink-200 sm:w-36">
          <SmartImage key={value} src={value} alt="" className="size-full object-cover" eager />
        </div>
        {/* Upload only: images live on this site's server, so no other site learns who views them. */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id={id}
              aria-labelledby={`${id}-label ${id}`}
              aria-describedby={`${id}-hint`}
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-ink-100 px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-ink-200 disabled:opacity-60"
            >
              <ImageUp aria-hidden="true" className="size-4" />
              {uploading ? 'מעלה…' : 'העלאת תמונה מהמחשב'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                <X aria-hidden="true" className="size-4" />
                הסרת התמונה
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <p id={`${id}-hint`} aria-live="polite" className={`text-sm ${error ? 'font-medium text-brand-700' : 'text-ink-600'}`}>
            {error ||
              (isUpload
                ? 'התמונה שמורה בשרת של האתר, מוקטנת ונקייה מפרטי מיקום ומכשיר.'
                : isExternal
                  ? 'זו תמונה זמנית מאתר חיצוני, שמקבל את כתובת ה-IP של כל גולש. מומלץ להחליף בתמונה שלכם.'
                  : 'בלי תמונה יוצג רקע קונפטי.')}
          </p>
        </div>
      </div>
    </div>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Up, down and delete for one row of a list. */
function RowActions({ index, length, onMove, onRemove, name }: { index: number; length: number; onMove: (to: number) => void; onRemove: () => void; name: string }) {
  return (
    <div className="flex shrink-0 items-center">
      <button type="button" className={smallButton} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`הזזת ${name} למעלה`}>
        <ArrowUp aria-hidden="true" className="size-4" />
      </button>
      <button type="button" className={smallButton} disabled={index === length - 1} onClick={() => onMove(index + 1)} aria-label={`הזזת ${name} למטה`}>
        <ArrowDown aria-hidden="true" className="size-4" />
      </button>
      <button type="button" className={`${smallButton} hover:bg-brand-50 hover:text-brand-700`} onClick={onRemove} aria-label={`מחיקת ${name}`}>
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full border border-dashed border-ink-300 px-4 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
    >
      <Plus aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}

/** A list of cards (categories, packages…) that can be added, removed and reordered. */
export function CardList<T>({
  items,
  onChange,
  itemName,
  title,
  create,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  /** "קטגוריה", used in button labels */
  itemName: string;
  title: (item: T, index: number) => string;
  create: () => T;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <section key={i} className="rounded-2xl bg-white ring-1 ring-ink-200">
          <header className="flex items-center justify-between gap-3 border-b border-ink-100 py-2 pe-2 ps-5">
            <h3 className="min-w-0 truncate font-bold text-ink-900">
              <span className="font-normal text-ink-500 tabular-nums">{i + 1}. </span>
              {title(item, i) || `${itemName} ללא שם`}
            </h3>
            <RowActions
              index={i}
              length={items.length}
              name={title(item, i) || itemName}
              onMove={(to) => onChange(move(items, i, to))}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
            />
          </header>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            {render(item, (patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))), i)}
          </div>
        </section>
      ))}
      <AddButton label={`הוספת ${itemName}`} onClick={() => onChange([...items, create()])} />
    </div>
  );
}

/** A compact list of short rows (menu links, opening hours, bullet points). */
export function RowList<T>({
  label,
  items,
  onChange,
  itemName,
  create,
  render,
  hint,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  itemName: string;
  create: () => T;
  render: (item: T, update: (next: T) => void, index: number) => ReactNode;
  hint?: string;
}) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 text-sm font-semibold text-ink-900">{label}</legend>
      {hint && <p className="-mt-0.5 mb-2 text-sm text-ink-600">{hint}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <div className="grid min-w-0 flex-1 gap-2 sm:auto-cols-fr sm:grid-flow-col">
              {render(item, (next) => onChange(items.map((it, j) => (j === i ? next : it))), i)}
            </div>
            <RowActions
              index={i}
              length={items.length}
              name={`${itemName} ${i + 1}`}
              onMove={(to) => onChange(move(items, i, to))}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
            />
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <AddButton label={`הוספת ${itemName}`} onClick={() => onChange([...items, create()])} />
      </div>
    </fieldset>
  );
}

/** Bare input for use inside RowList rows; the row's own label is given to screen readers. */
export function RowInput({ value, onChange, label, ltr, placeholder }: { value: string; onChange: (v: string) => void; label: string; ltr?: boolean; placeholder?: string }) {
  return (
    <input
      aria-label={label}
      value={value}
      placeholder={placeholder}
      dir={ltr ? 'ltr' : undefined}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} h-10 ${ltr ? 'text-right' : ''}`}
    />
  );
}
