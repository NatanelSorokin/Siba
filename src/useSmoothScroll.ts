import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect } from 'react';

/** Lenis already honours html { scroll-padding-top }, which clears the collapsed header. */
const ANCHOR_OFFSET = 0;

/** The running instance, so page changes can jump without Lenis gliding back. */
let active: Lenis | null = null;

/** Jump instantly (no glide) to the top, or to an element, e.g. after a page change. */
export function jumpTo(target: number | HTMLElement = 0) {
  if (active) active.scrollTo(target, { immediate: true, force: true });
  else if (typeof target === 'number') window.scrollTo(0, target);
  else target.scrollIntoView();
}

/**
 * Inertial wheel scrolling (Lenis). Touch keeps native scrolling.
 * Turns itself off while the OS asks for reduced motion or the
 * accessibility menu's "stop animations" mode is on.
 */
export default function useSmoothScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lenis: Lenis | null = null;

    const shouldRun = () => !reduceMotion.matches && !html.classList.contains('a11y-no-motion');

    const sync = () => {
      if (shouldRun() && !lenis) {
        lenis = new Lenis({ autoRaf: true, lerp: 0.1, wheelMultiplier: 1, allowNestedScroll: true });
        active = lenis;
      } else if (!shouldRun() && lenis) {
        lenis.destroy();
        lenis = null;
        active = null;
      }
    };

    // In-page links: glide to the target, then move focus there like a native jump.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!link) return;
      const hash = link.getAttribute('href') ?? '#';

      if (hash === '#') {
        e.preventDefault();
        if (lenis) lenis.scrollTo(0);
        else window.scrollTo({ top: 0, behavior: shouldRun() ? 'smooth' : 'auto' });
        return;
      }

      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: ANCHOR_OFFSET });
      else target.scrollIntoView({ behavior: shouldRun() ? 'smooth' : 'auto' });
      // keep the page's own route (#/terms etc.) in the address bar
      if (!window.location.hash.startsWith('#/')) history.pushState(null, '', hash);
      if (!target.hasAttribute('tabindex') && !target.matches('a, button, input, select, textarea')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus({ preventScroll: true });
    };

    sync();
    reduceMotion.addEventListener('change', sync);
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', onClick);

    return () => {
      reduceMotion.removeEventListener('change', sync);
      observer.disconnect();
      document.removeEventListener('click', onClick);
      lenis?.destroy();
      active = null;
    };
  }, []);
}
