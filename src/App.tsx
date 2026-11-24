/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import Categories from './components/Categories';
import FloatingAccessibility from './components/FloatingAccessibility';
import Footer from './components/Footer';
import Header from './components/Header';
import Hero from './components/Hero';
import PartyInABox from './components/PartyInABox';
import { missingDetails } from './legal/business';
import CancellationPage from './legal/CancellationPage';
import { AccessibilityStatement, PrivacyPolicy, ShippingPolicy, Terms } from './legal/pages';
import useRoute, { type Route } from './useRoute';
import useSmoothScroll, { jumpTo } from './useSmoothScroll';

const SITE_TITLE = 'סיבה למסיבה - ציוד למסיבות וימי הולדת';
const PAGE_TITLES: Record<Exclude<Route, 'home'>, string> = {
  accessibility: 'הצהרת נגישות',
  cancel: 'ביטול עסקה והחזרות',
  terms: 'תקנון האתר ותנאי רכישה',
  privacy: 'מדיניות פרטיות',
  shipping: 'זמני אספקה ומדיניות משלוחים',
};

/** Development only: lists the legally required business details that are still empty. */
function ComplianceChecklist() {
  const missing = missingDetails();
  if (!import.meta.env.DEV || missing.length === 0) return null;
  return (
    <aside className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6">
      <div className="rounded-2xl border-2 border-dashed border-sun-500 bg-sun-100 p-5 text-ink-900">
        <p className="font-bold">לפני העלאה לאוויר: חסרים פרטים שהחוק מחייב להציג באתר</p>
        <p className="mt-1 text-sm text-ink-700">
          ממלאים אותם בקובץ <code dir="ltr">src/legal/business.ts</code>. ההודעה הזו מוצגת רק בסביבת הפיתוח.
        </p>
        <ul className="mt-3 grid list-disc gap-x-8 gap-y-1 ps-5 text-sm sm:grid-cols-2">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function Page({ route, onAddToCart }: { route: Route; onAddToCart: (name: string) => void }) {
  switch (route) {
    case 'accessibility':
      return <AccessibilityStatement />;
    case 'cancel':
      return <CancellationPage />;
    case 'terms':
      return <Terms />;
    case 'privacy':
      return <PrivacyPolicy />;
    case 'shipping':
      return <ShippingPolicy />;
    default:
      return (
        <>
          <Hero />
          <Categories />
          <PartyInABox onAddToCart={onAddToCart} />
        </>
      );
  }
}

export default function App() {
  useSmoothScroll();
  const route = useRoute();
  const [cartCount, setCartCount] = useState(3);
  const [announcement, setAnnouncement] = useState('');

  const addToCart = useCallback((name: string) => {
    setCartCount((n) => n + 1);
    setAnnouncement(`${name} נוספה לסל`);
  }, []);

  // New page: start at the top (or at a home-page anchor), update the tab title, and announce it.
  useEffect(() => {
    document.title = route === 'home' ? SITE_TITLE : `${PAGE_TITLES[route]} | סיבה למסיבה`;
    const anchor = route === 'home' && !window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '';
    const target = anchor ? document.getElementById(anchor) : null;
    jumpTo(target ?? 0);
    if (route !== 'home') setAnnouncement(PAGE_TITLES[route]);
  }, [route]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="fixed right-4 top-3 z-[200] -translate-y-24 rounded-full bg-ink-900 px-5 py-3 font-semibold text-white shadow-lg transition-transform focus-visible:translate-y-0"
      >
        דלגו לתוכן הראשי
      </a>

      <Header cartCount={cartCount} />

      {/* Padding matches the expanded fixed header: 2.25rem bar + logo row + 3rem nav + 2 borders (rem, so it scales with the text-size mode) */}
      <main id="main" tabIndex={-1} className="w-full flex-1 pt-[10.875rem] outline-none md:pt-[14.375rem] lg:pt-[15.375rem]">
        <Page route={route} onAddToCart={addToCart} />
        <ComplianceChecklist />
      </main>

      <Footer />
      <FloatingAccessibility />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
