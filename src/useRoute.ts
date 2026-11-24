import { useEffect, useState } from 'react';

export type Route = 'home' | 'accessibility' | 'cancel' | 'terms' | 'privacy' | 'shipping';

const PAGES: Route[] = ['accessibility', 'cancel', 'terms', 'privacy', 'shipping'];

/** "#/terms" → "terms". Plain anchors ("#themes") and everything else stay on the home page. */
function parse(hash: string): Route {
  const match = hash.match(/^#\/([a-z-]+)/);
  const page = match?.[1] as Route | undefined;
  return page && PAGES.includes(page) ? page : 'home';
}

export const routeHref = (route: Route) => (route === 'home' ? '#/' : `#/${route}`);

/** Minimal hash router: legal pages live at #/<page>, so they work on any static host. */
export default function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return route;
}
