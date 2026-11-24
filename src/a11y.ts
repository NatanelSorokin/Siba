/**
 * Accessibility preferences: shape, persistence, and how they are applied to
 * the document. Every mode is a class (or CSS variable) on <html>, styled in
 * index.css, so it applies to the whole page without touching components.
 */

export type ColorMode = 'none' | 'monochrome' | 'sepia' | 'contrast' | 'black-yellow' | 'invert';
export type DescribeMode = 'none' | 'tooltip' | 'fixed';
export type CursorMode = 'none' | 'big' | 'black';

export type A11yPrefs = {
  keyboard: boolean;
  noMotion: boolean;
  color: ColorMode;
  headings: boolean;
  links: boolean;
  describe: DescribeMode;
  readable: boolean;
  /** text size steps: each step is 12.5% */
  font: number;
  /** page zoom steps: each step is 10% */
  zoom: number;
  cursor: CursorMode;
};

export const DEFAULT_PREFS: A11yPrefs = {
  keyboard: false,
  noMotion: false,
  color: 'none',
  headings: false,
  links: false,
  describe: 'none',
  readable: false,
  font: 0,
  zoom: 0,
  cursor: 'none',
};

export const FONT_RANGE = { min: -1, max: 4, step: 0.125 } as const;
export const ZOOM_RANGE = { min: -2, max: 5, step: 0.1 } as const;

export const fontScale = (p: A11yPrefs) => 1 + p.font * FONT_RANGE.step;
export const zoomScale = (p: A11yPrefs) => 1 + p.zoom * ZOOM_RANGE.step;

const STORAGE_KEY = 'a11y-prefs-v2';
const COLOR_MODES: Exclude<ColorMode, 'none'>[] = ['monochrome', 'sepia', 'contrast', 'black-yellow', 'invert'];

export function loadPrefs(): A11yPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return { ...DEFAULT_PREFS, ...saved };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: A11yPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: settings still apply for this visit */
  }
}

export function isDefault(p: A11yPrefs) {
  return (Object.keys(DEFAULT_PREFS) as (keyof A11yPrefs)[]).every((k) => p[k] === DEFAULT_PREFS[k]);
}

export function applyPrefs(p: A11yPrefs) {
  const html = document.documentElement;
  const set = (cls: string, on: boolean) => html.classList.toggle(cls, on);

  set('a11y-keyboard', p.keyboard);
  set('a11y-no-motion', p.noMotion);
  COLOR_MODES.forEach((m) => set(`a11y-${m}`, p.color === m));
  set('a11y-headings', p.headings);
  set('a11y-links', p.links);
  set('a11y-readable', p.readable);
  set('a11y-cursor-big', p.cursor === 'big');
  set('a11y-cursor-black', p.cursor === 'black');

  set('a11y-font', p.font !== 0);
  html.style.setProperty('--a11y-font-scale', String(fontScale(p)));
  set('a11y-zoom', p.zoom !== 0);
  html.style.setProperty('--a11y-zoom', String(zoomScale(p)));
}
