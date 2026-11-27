/** Unknown address: say so plainly and offer the way back. */
export default function NotFound({ text = 'ייתכן שהקישור שגוי, או שהדף הוסר.' }: { text?: string }) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <h1 className="font-display text-4xl font-bold text-ink-900">הדף לא נמצא</h1>
      <p className="mt-3 text-lg text-ink-600">{text}</p>
      <a
        href="/"
        className="mt-8 inline-flex h-12 items-center rounded-full bg-brand-600 px-7 font-semibold text-white transition-colors hover:bg-brand-700"
      >
        לדף הבית
      </a>
    </section>
  );
}
