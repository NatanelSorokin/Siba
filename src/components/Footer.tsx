import { Instagram, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { useContent } from '../content/store';
import { instagramUrl, telHref } from '../legal/business';
import { req } from '../legal/Missing';
import Confetti from './Confetti';
import Logo from './Logo';

const contactLink =
  'inline-flex items-center gap-2.5 py-1 underline-offset-4 transition-colors hover:text-brand-700 hover:underline';
const contactIcon = 'size-4 shrink-0 text-brand-600';

const serviceLinks = [
  { label: 'ביטול עסקה', href: '/cancel' },
  { label: 'תקנון האתר ותנאי רכישה', href: '/terms' },
  { label: 'מדיניות פרטיות ואבטחת מידע', href: '/privacy' },
  { label: 'זמני אספקה ומדיניות משלוחים', href: '/shipping' },
  { label: 'הצהרת נגישות', href: '/accessibility' },
  { label: 'שאלות ותשובות נפוצות', href: '#' },
];


export default function Footer() {
  const { business, footer } = useContent();
  return (
    <footer id="site-footer" className="relative isolate mt-24 w-full overflow-hidden bg-brand-50 pb-8 pt-20 text-ink-900 md:mt-32">
      {/* the logo's confetti, scattered along the top edge */}
      <Confetti count={60} seed={17} minRadius={2.5} maxRadius={10} className="footer-confetti absolute inset-x-0 top-0 -z-10 h-28" />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Logo className="size-12" compact alt="" />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-2xl font-bold text-brand-700">{business.tradeName}</span>
              {footer.tagline && <span className="text-sm font-semibold text-ink-700">{footer.tagline}</span>}
            </span>
          </div>
          {footer.description && <p className="max-w-sm leading-relaxed text-ink-600">{footer.description}</p>}
          <p className="text-[0.9375rem] text-ink-700">
            {business.email ? (
              <a href={`mailto:${business.email}`} className={contactLink}>
                <Mail aria-hidden="true" className={contactIcon} />
                <span className="sr-only">דוא"ל:</span>
                <span dir="ltr">{business.email}</span>
              </a>
            ) : (
              <span className="inline-flex items-center gap-2.5 py-1">
                <Mail aria-hidden="true" className={contactIcon} />
                {req('', 'דוא"ל')}
              </span>
            )}
          </p>
          {footer.secureLabel && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-700">
            <ShieldCheck aria-hidden="true" className="size-4 text-lagoon-600" />
            {footer.secureLabel}
          </span>
          )}
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
          {/* Contact rows: plain, so they read as information rather than buttons */}
          <ul className="flex flex-col gap-1 text-[0.9375rem] text-ink-700">
            {business.phone && (
              <li>
                <a href={`tel:${telHref(business.phone)}`} className={contactLink}>
                  <Phone aria-hidden="true" className={contactIcon} />
                  <span className="sr-only">טלפון:</span>
                  <span dir="ltr" className="font-semibold text-ink-900 tabular-nums">
                    {business.phone}
                  </span>
                </a>
              </li>
            )}
            <li className="flex items-start gap-2.5 py-1">
              <MapPin aria-hidden="true" className={`${contactIcon} mt-1`} />
              <span className="sr-only">כתובת:</span>
              <span>{req(business.address, 'כתובת העסק')}</span>
            </li>
            {business.instagram && (
              <li>
                <a
                  href={instagramUrl(business.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`עקבו אחרינו באינסטגרם, @${business.instagram} (נפתח בחלון חדש)`}
                  className={contactLink}
                >
                  <Instagram aria-hidden="true" className={contactIcon} />
                  <span dir="ltr">@{business.instagram}</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-14 flex max-w-7xl flex-col items-center gap-3 border-t border-ink-100 px-4 pt-6 text-center text-sm text-ink-600 sm:px-6">
        <p className="text-ink-500">
          © כל הזכויות שמורות ל{business.legalName}{business.domain && ` (${business.domain})`}. מופעל על פי חוקי מדינת ישראל וחוק הגנת הצרכן תשמ"א-1981.
        </p>
      </div>
    </footer>
  );
}
