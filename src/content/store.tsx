import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import bundled from './site-content.json';
import type { Product, SiteContent } from './types';

/**
 * Where the site's content comes from, in order:
 * 1. Inlined by Django into index.html (production): already current at first paint.
 * 2. Otherwise the bundled site-content.json, replaced by /api/content/ once it answers
 *    (development, or a static host without the backend: the bundled copy stays).
 * 3. Inside the admin panel's preview frame: the unpublished draft, sent live by the panel.
 */
export const bundledContent = bundled as SiteContent;

/** Messages between the admin panel and its preview frame. */
export const PREVIEW_READY = 'siba:preview-ready';
export const PREVIEW_DRAFT = 'siba:preview-draft';

/** True inside the admin panel's live preview frame. */
export const IS_PREVIEW = window.self !== window.top && new URLSearchParams(window.location.search).has('preview');

/**
 * Fill whatever `value` lacks from `base`, and drop what `base` doesn't know.
 * Keeps content from older versions and imported backups working after fields change.
 */
function fill<T>(base: T, value: unknown): T {
  if (Array.isArray(base)) {
    if (!Array.isArray(value)) return base;
    const template = base[0];
    return (template === undefined ? value : value.map((v) => fill(template, v))) as T;
  }
  if (base && typeof base === 'object') {
    const src = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(base)) out[key] = fill((base as Record<string, unknown>)[key], src[key]);
    return out as T;
  }
  return (typeof value === typeof base ? value : base) as T;
}

/** Turns anything (an API answer, a backup file) into complete content, or null if it isn't site content. */
export function normalize(value: unknown): SiteContent | null {
  if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1) return null;
  const content = fill(bundledContent, value);
  // The bundled catalog has no products to copy the shape from: check each against a blank one.
  content.catalog.products = content.catalog.products.map((p) => fill(BLANK_PRODUCT, p));
  return content;
}

export const BLANK_PRODUCT: Product = {
  id: '',
  categoryId: '',
  name: '',
  description: '',
  price: '',
  oldPrice: '',
  image: '',
  stock: '',
};

function readInlineContent(): SiteContent | null {
  const el = document.getElementById('site-content');
  if (!el?.textContent) return null;
  try {
    return normalize(JSON.parse(el.textContent));
  } catch {
    return null;
  }
}

const ContentContext = createContext<SiteContent>(bundledContent);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [inline] = useState(readInlineContent);
  const [content, setContent] = useState<SiteContent>(inline ?? bundledContent);

  // No inlined content (development): ask the backend for the published version.
  useEffect(() => {
    if (inline || IS_PREVIEW) return;
    const ctrl = new AbortController();
    api<unknown>('/api/content/', { signal: ctrl.signal })
      .then((data) => {
        const next = normalize(data);
        if (next) setContent(next);
      })
      .catch(() => {
        /* backend unreachable: keep the bundled content */
      });
    return () => ctrl.abort();
  }, [inline]);

  // Preview frame: show whatever draft the admin panel sends, as it's typed.
  useEffect(() => {
    if (!IS_PREVIEW) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (e.data?.type !== PREVIEW_DRAFT) return;
      const next = normalize(e.data.content);
      if (next) setContent(next);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
export const useBusiness = () => useContext(ContentContext).business;

/** Saves the content as a JSON backup file. */
export function downloadContent(content: SiteContent) {
  const blob = new Blob([JSON.stringify(content, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `site-content-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
