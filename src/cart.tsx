import type { Sellable } from './catalog';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * The shopping cart. It lives only in this browser (localStorage): nothing is
 * sent anywhere until the visitor chooses to order.
 *
 * A line keeps the name and price seen when it was added, but the cart shows
 * the current price from the site's content (the law requires the real price),
 * and marks a line whose product no longer exists.
 */
export type CartLine = { id: string; name: string; price: number; qty: number };

export const MAX_QTY = 20;
const STORAGE_KEY = 'cart-v1';

function load(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((l) => l && typeof l.id === 'string' && typeof l.name === 'string' && Number.isFinite(l.price) && Number.isInteger(l.qty))
      // Carts saved before the product catalog held bare package ids ("basic").
      .map((l) => ({ id: l.id.includes(':') ? l.id : `package:${l.id}`, name: l.name, price: l.price, qty: Math.min(MAX_QTY, Math.max(1, l.qty)) }));
  } catch {
    return [];
  }
}

type Cart = {
  lines: CartLine[];
  /** Total number of items (quantities added up). */
  count: number;
  isOpen: boolean;
  /** Adds `qty` (default 1) of the item; the line never goes past MAX_QTY. */
  add: (item: Omit<CartLine, 'qty'>, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  /** Empties the cart (after a paid order). */
  clear: () => void;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (lines.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage full or blocked: the cart still works for this visit */
    }
  }, [lines]);

  // Another tab changed the cart: follow it.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) setLines(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((item: Omit<CartLine, 'qty'>, qty = 1) => {
    const n = Math.max(1, Math.min(MAX_QTY, Math.floor(qty)));
    setLines((prev) => {
      const found = prev.find((l) => l.id === item.id);
      if (found) return prev.map((l) => (l.id === item.id ? { ...l, ...item, qty: Math.min(MAX_QTY, l.qty + n) } : l));
      return [...prev, { ...item, qty: n }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) =>
      qty < 1 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
    );
  }, []);

  const remove = useCallback((id: string) => setLines((prev) => prev.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo<Cart>(
    () => ({ lines, count: lines.reduce((n, l) => n + l.qty, 0), isOpen, add, setQty, remove, clear, open, close }),
    [lines, isOpen, add, setQty, remove, clear, open, close],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Cart {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('useCart must be used inside <CartProvider>');
  return cart;
}

/** The cart's lines with today's names and prices; lines whose product is gone are marked unavailable. */
export function priceLines(lines: CartLine[], items: Map<string, Sellable>) {
  const rows = lines.map((line) => {
    const item = items.get(line.id);
    const max = item?.max ?? 0;
    return {
      ...line,
      name: item?.name || line.name,
      price: item?.price ?? NaN,
      image: item?.image ?? '',
      max,
      /** In the shop and in stock */
      available: Boolean(item) && max > 0,
      soldOut: Boolean(item) && max === 0,
      /** More in the cart than is left */
      tooMany: max > 0 && line.qty > max,
    };
  });
  const total = rows.reduce((sum, r) => sum + (r.available ? r.price * r.qty : 0), 0);
  return { rows, total };
}

/** "149" → "₪149", "139.9" → "₪139.90" */
export const formatPrice = (n: number) => `₪${Number.isInteger(n) ? n : n.toFixed(2)}`;
