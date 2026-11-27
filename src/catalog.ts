import { MAX_QTY } from './cart';
import type { Product, SiteContent } from './content/types';

/**
 * Everything that can go in the cart, by cart id: "package:basic" (a party
 * package) or "product:p-123" (a catalog product). The server prices orders by
 * the same ids from the same published content (backend/content/orders.py).
 */
/** `max`: how many may be bought (0 = sold out). */
export type Sellable = { id: string; name: string; price: number; image: string; max: number };

/** How many of a product may still be bought: the stock, or the cart's limit when stock isn't tracked. */
export const stockLeft = (p: Product) => (p.stock.trim() === '' ? MAX_QTY : Math.max(0, Math.min(MAX_QTY, Math.floor(Number(p.stock)) || 0)));

const priceOf = (value: string) => {
  const n = Number(value);
  return value.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

export function sellables(content: SiteContent): Map<string, Sellable> {
  const out = new Map<string, Sellable>();
  for (const t of content.packages.tiers) {
    const price = priceOf(t.price);
    if (price) out.set(`package:${t.id}`, { id: `package:${t.id}`, name: t.name, price, image: '', max: MAX_QTY });
  }
  const categories = new Set(content.catalog.categories.map((c) => c.id));
  for (const p of content.catalog.products) {
    const price = priceOf(p.price);
    if (price && categories.has(p.categoryId)) {
      out.set(`product:${p.id}`, { id: `product:${p.id}`, name: p.name, price, image: p.image, max: stockLeft(p) });
    }
  }
  return out;
}

/** Products shown on a category page: the ones with a price (sold-out ones included, marked). */
export const productsIn = (content: SiteContent, categoryId: string) =>
  content.catalog.products.filter((p) => p.categoryId === categoryId && priceOf(p.price) !== null);

export const categoryHref = (id: string) => `/category/${id}`;
