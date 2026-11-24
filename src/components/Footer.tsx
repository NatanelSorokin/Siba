import { ShieldCheck } from 'lucide-react';
import { business } from '../legal/business';
import { req } from '../legal/Missing';
import Confetti from './Confetti';
import Logo from './Logo';

const serviceLinks = [
  { label: 'ביטול עסקה', href: '#/cancel' },
  { label: 'תקנון האתר ותנאי רכישה', href: '#/terms' },
  { label: 'מדיניות פרטיות ואבטחת מידע', href: '#/privacy' },
  { label: 'זמני אספקה ומדיניות משלוחים', href: '#/shipping' },
  { label: 'הצהרת נגישות', href: '#/accessibility' },
  { label: 'שאלות ותשובות נפוצות', href: '#' },
];


export default function Footer() {
  return (
    <footer className="relative isolate mt-24 w-full overflow-hidden bg-brand-50 pb-8 pt-20 text-ink-900 md:mt-32">
      {/* the logo's confetti, scattered along the top edge */}
      <Confetti count={60} seed={17} minRadius={2.5} maxRadius={10} className="footer-confetti absolute inset-x-0 top-0 -z-10 h-28" />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Logo className="size-12" compact alt="" />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-2xl font-bold text-brand-700">סיבה למסיבה</span>
              <span className="text-sm font-semibold text-ink-700">החגיגה מתחילה כאן</span>
            </span>
          </div>
          <p className="max-w-sm leading-relaxed text-ink-600">
            היעד המוביל בישראל לציוד ימי הולדת, בלוני הליום מעוצבים, מסיבות נושא ופתרונות אירוח מתקדמים. שירות אדיב, איכות ללא פשרות ומשלוח מהיר עד דלת הבית.
          </p>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-700">
            <ShieldCheck aria-hidden="true" className="size-4 text-lagoon-600" />
            קנייה מאובטחת
          </span>
        </div>

        {/* Service links */}
        <nav aria-labelledby="footer-service-title" className="flex flex-col gap-4">
          <h2 id="footer-service-title" className="text-base font-bold text-ink-900">
            הגנת הצרכן ושירות
          </h2>
          <ul className="flex flex-col gap-1 text-[0.9375rem] text-ink-600">
            {serviceLinks.map((link) => (
              <li key={link.label}>
                {/* Dedicated cancellation link, first in the list on every page (Consumer Protection Law) */}
                <a
                  href={link.href}
                  className="inline-flex items-center gap-1.5 py-1.5 underline-offset-4 transition-colors hover:text-brand-700 hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Hours */}
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-ink-900">סניפים ושעות פעילות</h2>
          <dl className="flex flex-col gap-2 text-[0.9375rem] text-ink-600">
            {business.hours.map((row) => (
              <div key={row.days} className="flex flex-wrap gap-1.5">
                <dt className="font-bold text-ink-900">{row.days}:</dt>
                <dd className="tabular-nums">{row.time}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mx-auto mt-14 flex max-w-7xl flex-col items-center gap-3 border-t border-ink-100 px-4 pt-6 text-center text-sm text-ink-600 sm:px-6">
        {/* Business identification (Consumer Protection Law §14ג) */}
        <address className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 not-italic">
          <span className="font-semibold text-ink-800">{business.legalName}</span>
          <span>ח.פ. {req(business.companyId, 'מספר ח.פ.')}</span>
          <span>{req(business.address, 'כתובת העסק')}</span>
          <a href={`tel:${business.phoneHref}`} dir="ltr" className="hover:text-brand-700 hover:underline">
            {business.phone}
          </a>
          {business.email ? (
            <a href={`mailto:${business.email}`} className="hover:text-brand-700 hover:underline">
              {business.email}
            </a>
          ) : (
            req('', 'דוא"ל')
          )}
        </address>
        <p className="text-ink-500">
          © כל הזכויות שמורות ל"סיבה למסיבה" בע"מ (siba-lmesiba.co.il). מופעל על פי חוקי מדינת ישראל וחוק הגנת הצרכן תשמ"א-1981.
        </p>
      </div>
    </footer>
  );
}
