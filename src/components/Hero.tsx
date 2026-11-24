import { ArrowLeft, PartyPopper, Sparkles } from 'lucide-react';
import Confetti from './Confetti';

/** Price sticker, slapped onto the disc like a party-shop label. */
function Sticker({ className = '' }: { className?: string }) {
  return (
    <div
      className={`sticker flex flex-col items-center justify-center rounded-full bg-sun-400 p-5 text-center text-ink-900 shadow-[0_18px_36px_-16px_rgb(140_15_72/0.55)] ${className}`}
    >
      <span aria-hidden="true" className="absolute inset-2 rounded-full border-2 border-white/90" />
      <span className="relative mb-2 rounded-full bg-brand-600 px-3 py-0.5 text-sm font-bold text-white">חדש!</span>
      <span className="relative max-w-[9.5rem] text-sm font-semibold leading-snug">ערכת מסיבה מושלמת ל-16 חוגגים</span>
      <span className="relative mt-1.5 font-display text-4xl font-bold leading-none tabular-nums lg:text-[2.75rem]">₪139.90</span>
      <span className="relative mt-0.5 text-sm font-semibold">בלבד</span>
    </div>
  );
}

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* The logo's confetti field */}
      <Confetti
        animate
        count={120}
        seed={11}
        minRadius={3}
        maxRadius={14}
        className="hero-confetti-fade absolute inset-0 -z-10"
      />

      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 pb-24 pt-8 sm:px-6 md:pb-20 md:pt-12">
        <div className="relative">
          {/* The logo's pink disc, with its thin white inner ring */}
          <div className="hero-disc relative flex w-full max-w-[34rem] flex-col items-center justify-center rounded-[2.75rem] bg-brand-600 px-6 pb-32 pt-12 text-center text-white shadow-[0_40px_80px_-40px_rgb(140_15_72/0.65)] md:aspect-square md:w-[32rem] md:rounded-full md:px-16 md:py-0 lg:w-[35rem]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-3 rounded-[2.25rem] border-2 border-white/90 md:inset-4 md:rounded-full"
            />

            <h1 id="hero-title" className="relative font-display text-[2.5rem] font-bold leading-[1.05] md:text-5xl lg:text-[3.5rem]">
              <span lang="en" className="mb-3 block text-2xl font-bold tracking-wide text-sun-300 lg:text-[1.75rem]">
                K-POP DEMON HUNTERS
              </span>
              חוגגים יום הולדת בקצב מטורף!
            </h1>

            <p className="relative mt-4 max-w-[22rem] text-base leading-relaxed text-white lg:text-lg">
              הלהיט שכבש את הילדים עכשיו במגוון ענק של צלחות, כוסות ממותגות, מפיות, קישוטי קיר ובלוני פרימיום.
            </p>

            <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2.5">
              <a
                href="#"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 font-bold text-brand-700 shadow-[0_10px_22px_-12px_rgb(0_0_0/0.45)] transition-[background-color,transform] duration-200 hover:bg-sun-100 active:scale-[0.97]"
              >
                לרכישה
                <ArrowLeft
                  aria-hidden="true"
                  className="size-5 transition-transform duration-300 ease-out-expo group-hover:-translate-x-1"
                />
              </a>
              <a
                href="#themes"
                className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-white/70 px-6 font-semibold text-white transition-[background-color,border-color] duration-200 hover:border-white hover:bg-white/10"
              >
                לכל הקולקציות
                <PartyPopper aria-hidden="true" className="size-5 text-sun-300" />
              </a>
            </div>

            <p className="relative mt-5 flex items-center gap-1.5 text-sm font-medium text-white">
              <Sparkles aria-hidden="true" className="size-4 text-sun-300" />
              קולקציה בלעדית במהדורה מיוחדת
            </p>
          </div>

          {/* Desktop: overlaps the disc's lower-left edge. Mobile: hangs off the card's bottom. */}
          <Sticker className="absolute -bottom-16 left-2 size-44 md:-bottom-2 md:-left-24 md:size-52 lg:-left-28 lg:size-56" />
        </div>
      </div>
    </section>
  );
}
