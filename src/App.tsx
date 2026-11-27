/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import Categories from './components/Categories';
import FloatingAccessibility from './components/FloatingAccessibility';
import Footer from './components/Footer';
import Header from './components/Header';
import Hero from './components/Hero';
import PartyInABox from './components/PartyInABox';
import { useCart } from './cart';
import CartDrawer from './components/CartDrawer';
import { IS_PREVIEW, useBusiness, useContent } from './content/store';
import type { Product, Tier } from './content/types';
import { missingDetails } from './legal/business';
import CancellationPage from './legal/CancellationPage';
import { AccessibilityStatement, PrivacyPolicy, ShippingPolicy, Terms } from './legal/pages';
import CategoryPage from './pages/CategoryPage';
import CheckoutPage from './pages/CheckoutPage';
import NotFound from './pages/NotFound';
import OrderPage from './pages/OrderPage';
import useRoute, { type Route } from './useRoute';
import useSmoothScroll, { jumpTo } from './useSmoothScroll';

// The admin panel is only for the owner: load it on demand, outside the visitors' bundle.
const AdminPanel = lazy(() => import('./admin/AdminPanel'));

const PAGE_TITLES: Record<Exclude<Route, 'home' | 'category'>, string> = {
  accessibility: 'הצהרת נגישות',
  cancel: 'ביטול עסקה והחזרות',
  terms: 'תקנון האתר ותנאי רכישה',
  privacy: 'מדיניות פרטיות',
  shipping: 'זמני אספקה ומדיניות משלוחים',
  checkout: 'הזמנה ותשלום',
  order: 'סטטוס הזמנה',
  admin: 'ניהול האתר',
  notfound: 'הדף לא נמצא',
};

/** Development only: lists the legally required business details that are still empty. */
function ComplianceChecklist() {
  const missing = missingDetails(useBusiness());
  if (!import.meta.env.DEV || IS_PREVIEW || missing.length === 0) return null;
  return (
    <aside className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6">
      <div className="rounded-2xl border-2 border-dashed border-sun-500 bg-sun-100 p-5 text-ink-900">
        <p className="font-bold">לפני העלאה לאוויר: חסרים פרטים שהחוק מחייב להציג באתר</p>
        <p className="mt-1 text-sm text-ink-700">
          ממלאים אותם ב<a href="/admin" className="font-semibold text-brand-700 underline underline-offset-4">פאנל הניהול</a>,
          בלשונית "פרטי העסק". ההודעה הזו מוצגת רק בסביבת הפיתוח.
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

type PageProps = { route: Route; param: string; onAddTier: (tier: Tier) => void; onAddProduct: (product: Product, qty: number) => void };

function Page({ route, param, onAddTier, onAddProduct }: PageProps) {
  switch (route) {
    case 'category':
      return <CategoryPage key={param} id={param} onAdd={onAddProduct} />;
    case 'checkout':
      return <CheckoutPage />;
    case 'order':
      return <OrderPage key={param} token={param} />;
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
    case 'notfound':
      return <NotFound />;
    default:
      return (
        <>
          <Hero />
          <Categories />
          <PartyInABox onAddToCart={onAddTier} />
        </>
      );
  }
}

export default function App() {
  useSmoothScroll();
  const { route, param, path } = useRoute();
  const { tradeName } = useBusiness();
  const { catalog } = useContent();
  const categoryName = route === 'category' ? catalog.categories.find((c) => c.id === param)?.name : undefined;
  const pageTitle = route === 'home' ? '' : route === 'category' ? (categoryName ?? 'הדף לא נמצא') : PAGE_TITLES[route];
  const cart = useCart();
  const [announcement, setAnnouncement] = useState('');

  const { add } = cart;
  const addTier = useCallback(
    (tier: Tier) => {
      add({ id: `package:${tier.id}`, name: tier.name, price: Number(tier.price) });
      setAnnouncement(`${tier.name} נוספה לסל`);
    },
    [add],
  );
  const addProduct = useCallback(
    (product: Product, qty = 1) => {
      add({ id: `product:${product.id}`, name: product.name, price: Number(product.price) }, qty);
      setAnnouncement(qty > 1 ? `${qty} יחידות של ${product.name} נוספו לסל` : `${product.name} נוסף לסל`);
    },
    [add],
  );

  // New page: start at the top (or at the #anchor in the address), update the tab title, and announce it.
  useEffect(() => {
    document.title = route === 'home' ? `${tradeName} - ציוד למסיבות וימי הולדת` : `${pageTitle} | ${tradeName}`;
  }, [route, pageTitle, tradeName]);

  useEffect(() => {
    let anchor = '';
    try {
      anchor = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      /* malformed #fragment: ignore */
    }
    const target = anchor ? document.getElementById(anchor) : null;
    jumpTo(target ?? 0);
    if (route !== 'home') setAnnouncement(pageTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per new address, not when the title text changes
  }, [path]);

  if (route === 'admin') {
    return (
      <Suspense fallback={<p className="p-10 text-center text-ink-600">טוען את פאנל הניהול…</p>}>
        <AdminPanel />
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="fixed right-4 top-3 z-[200] -translate-y-24 rounded-full bg-ink-900 px-5 py-3 font-semibold text-white shadow-lg transition-transform focus-visible:translate-y-0"
      >
        דלגו לתוכן הראשי
      </a>

      <Header />

      {/* Padding matches the expanded fixed header: 2.25rem bar + logo row + 3rem nav + 2 borders (rem, so it scales with the text-size mode) */}
      <main id="main" tabIndex={-1} className="w-full flex-1 pt-[8.625rem] outline-none md:pt-[12.125rem] lg:pt-[13.125rem]">
        <Page route={route} param={param} onAddTier={addTier} onAddProduct={addProduct} />
        <ComplianceChecklist />
      </main>

      <Footer />
      <FloatingAccessibility />
      <CartDrawer />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
