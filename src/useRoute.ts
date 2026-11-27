import { useEffect, useState } from 'react';

export type Route =
  | 'home'
  | 'accessibility'
  | 'cancel'
  | 'terms'
  | 'privacy'
  | 'shipping'
  | 'checkout'
  | 'category'
  | 'order'
  | 'admin'
  | 'notfound';

const PAGES: Route[] = ['accessibility', 'cancel', 'terms', 'privacy', 'shipping', 'checkout', 'admin'];

/** Paths the server answers itself; links to them are ordinary page loads. */
const SERVER_PATHS = /^\/(api|media|django-admin|static)(\/|$)/;

/** Fired after every in-app navigation (history.pushState doesn't fire popstate). */
export const LOCATION_CHANGE = 'siba:location-change';

/**
 * "/terms" → "terms", "/" → "home", "/admin/hero" → "admin", "/category/balloons" → "category"
 * (param "balloons"), "/order/<token>" → "order", anything else → "notfound".
 */
export function parse(pathname: string): { route: Route; param: string } {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return { route: 'home', param: '' };
  const page = parts[0] as Route;
  if (page === 'admin' && parts.length <= 2) return { route: 'admin', param: parts[1] ?? '' };
  if (page === 'category' && parts.length === 2 && /^[a-z0-9-]+$/.test(parts[1])) return { route: 'category', param: parts[1] };
  if (page === 'order' && parts.length === 2 && /^[A-Za-z0-9_-]+$/.test(parts[1])) return { route: 'order', param: parts[1] };
  return { route: parts.length === 1 && PAGES.includes(page) ? page : 'notfound', param: '' };
}

export const routeHref = (route: Route) => (route === 'home' ? '/' : `/${route}`);

export function navigate(to: string, { replace = false } = {}) {
  if (replace) history.replaceState(null, '', to);
  else history.pushState(null, '', to);
  window.dispatchEvent(new Event(LOCATION_CHANGE));
}

/** Calls back on any address change: links, back/forward, navigate(). */
export function onLocationChange(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener(LOCATION_CHANGE, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(LOCATION_CHANGE, callback);
  };
}

/** Old links from before clean addresses ("/#/terms") still land on the right page. */
function upgradeLegacyHash() {
  const legacy = window.location.hash.match(/^#\/(.*)$/);
  if (legacy) history.replaceState(null, '', `/${legacy[1]}`);
}

/**
 * Router with clean addresses (/terms, /admin). Internal links are ordinary
 * <a href="/terms"> elements: a click is handled here without reloading the
 * page, and the server (Django, or Vite in development) answers a direct visit
 * to any of these addresses with the site.
 */
export default function useRoute(): { route: Route; param: string; path: string } {
  const [path, setPath] = useState(() => {
    upgradeLegacyHash();
    return window.location.pathname;
  });

  useEffect(() => {
    const stopListening = onLocationChange(() => setPath(window.location.pathname));

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      const href = link.getAttribute('href') ?? '';
      if (!href.startsWith('/') || href.startsWith('//')) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || SERVER_PATHS.test(url.pathname)) return;
      // Same page, different #anchor: the browser jumps there itself.
      if (url.pathname === window.location.pathname && url.hash) return;
      e.preventDefault();
      const to = url.pathname + url.search + url.hash;
      if (to !== window.location.pathname + window.location.search + window.location.hash) navigate(to);
    };
    document.addEventListener('click', onClick);

    return () => {
      stopListening();
      document.removeEventListener('click', onClick);
    };
  }, []);

  return { ...parse(path), path };
}
