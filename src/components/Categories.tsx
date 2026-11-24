import { ArrowLeft } from 'lucide-react';
import SmartImage from './SmartImage';

/** The logo's three confetti colours, dealt in turn. */
const DOTS = ['bg-brand-400', 'bg-sun-400', 'bg-lagoon-400'];

const topCategories = [
  {
    title: 'מוצרי מסיבה',
    imgSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGt7V1V7lW7z0_w-085Dcv4-x17K6E9aX7b_oXf2c8rC-P6D2jW4mJm2R9_O1D5s5Z9nQ',
  },
  {
    title: 'קולקציית בוב ספוג',
    imgSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAnqB1mHk4n_7n2o4_xX1L8m1V7z6Q9-tW_oP_yX9a1B5z4C8v3D2k1J5m7N9Q',
  },
  {
    title: 'ממתקים',
    imgSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbDV_OfR8Le1Bok_7Nho5uffCYUcbZ6kOe2tqL-KQ6Hz8s-7NgYEH9xFDYfCPB9i_klNaUZw-DwGoekpAUyeIXhApoV15dhfFLBeZ_326rwJ-W6ZCT85saeJdcVswPv0Taj5kY1Yps7LHbJe0Gkw9V3KjYTiQzYfnRtKGDfiQTDiaipQOE-2pwwbZIA-pBxSvaDDWBD-sqhm65rQH4WJSzSasyOq3VeDcqeeTk4xpGUNH7zNLoVRY-9Q',
  },
];

const themes = [
  {
    title: 'עולם החד קרן הקסום',
    subtitle: 'בלוני ענק, קשתות אורגניות וכלים תואמים',
    imgSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARgzA_QENQtyWq9EYne0MNtWWMRyTYKHQTk6fDygtHB96onQZv2-Ef2ZHItwpKqTL8bTG1BBT_FRnHyT6Jfrf52sGQKkPWSH1p7WtTOyAk4cfj37ocWMsIeoKVnYXj0akiJLZrUTWnkHAfBSmVF2J5kGxmG3YCgfvo4Wg6rZhiLSJnr9dZPDeRd7v0XuekjJF-PvKRYtjnVAssAyd-xEAQ7OAJ1Fme_B5k7bMXkR3OoqL9dX7WkqZMsg',
  },
  {
    title: 'חגיגה פסטלית - יום הולדת שמח',
    subtitle: 'מניפות נייר, דגלונים ועוגות מעוצבות',
    imgSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAnVhyGH-WchAZlN08NNP7qPXPv1ScKTMLpYkQxxImAy98-OuNQi9PxSx56_umqwqvNFgl0714hdi00FOvP-_IoILXZLLGtNDUskXvkRYPxgH7n-t6JzO8L5df_gI98Giv1frxy5O6rmDZdyB1vfP-p4MNY-tJzok7izBCwX2Yfkv4a5kAzLG_MW_xO_G_QbfqKoQNuQ_BhxqK-uWCOYRetAePp3iwjrUfnAEkc8iiSdDyHZIUzheH1Lw',
  },
];

export default function Categories() {
  return (
    <>
      {/* Top categories */}
      <section aria-labelledby="top-categories-title" className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 md:pt-20">
        <h2 id="top-categories-title" className="sr-only">
          קטגוריות מובילות
        </h2>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-3">
          {topCategories.map((cat, idx) => (
            <li key={cat.title} className={idx === 2 ? 'sm:col-span-2 md:col-span-1' : undefined}>
              <a href="#" className="group block rounded-3xl">
                <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-ink-100 ring-1 ring-ink-900/5">
                  <SmartImage
                    src={cat.imgSrc}
                    alt=""
                    seed={idx + 21}
                    width={640}
                    height={480}
                    className="motion-zoom size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                  />
                </div>
                <h3 className="mt-4 flex items-center justify-between gap-3 px-1 font-display text-xl font-bold text-ink-900 transition-colors group-hover:text-brand-700">
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${DOTS[idx % DOTS.length]}`} />
                    {cat.title}
                  </span>
                  <ArrowLeft
                    aria-hidden="true"
                    className="size-5 shrink-0 text-brand-600 opacity-0 transition-[opacity,transform] duration-300 ease-out-expo group-hover:-translate-x-1 group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </h3>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Themes showcase */}
      <section aria-labelledby="themes-title" id="themes" className="mx-auto w-full max-w-7xl px-4 pt-20 sm:px-6 md:pt-28">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="themes-title" className="font-display text-3xl font-bold text-ink-900 md:text-4xl">
              מסיבות לפי נושא
            </h2>
            <p className="mt-2 text-lg text-ink-600">האירוע המושלם שלכם עם המוצרים המשמחים שלנו</p>
          </div>
          <a
            href="#"
            className="inline-flex w-fit items-center gap-1.5 font-semibold text-brand-700 underline decoration-brand-200 decoration-2 underline-offset-[6px] transition-colors hover:decoration-brand-600"
          >
            לכל המוצרים
            <ArrowLeft aria-hidden="true" className="size-4" />
          </a>
        </div>

        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {themes.map((theme, idx) => (
            <li key={theme.title}>
              <a
                href="#"
                className="group relative block aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-ink-100 sm:aspect-[16/10]"
              >
                <SmartImage
                  src={theme.imgSrc}
                  alt=""
                  seed={idx + 41}
                  width={800}
                  height={500}
                  className="motion-zoom size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/85 via-ink-950/45 to-transparent p-6 pt-20 text-white md:p-8 md:pt-24">
                  <h3 className="font-display text-2xl font-bold">{theme.title}</h3>
                  <p className="on-dark-muted mt-1 text-white/85">{theme.subtitle}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
