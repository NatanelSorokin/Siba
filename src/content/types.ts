/**
 * The whole editable site, as one plain-JSON document.
 *
 * Every text, price, image and business detail the owner can change lives
 * here, and the admin panel (/admin) edits exactly this shape. Keep it plain
 * data (strings, numbers, booleans, arrays, objects) so it can be saved in the
 * browser today and sent to a backend later without changes.
 */

export type Link = { label: string; href: string };

export type Business = {
  tradeName: string;
  legalName: string;
  /** ח.פ. / ע.מ. */
  companyId: string;
  /** Street, number, city */
  address: string;
  phone: string;
  email: string;
  /** Instagram username, without @ (empty = not shown) */
  instagram: string;
  domain: string;
  hours: { days: string; time: string }[];
  paymentMethods: string[];
  accessibilityCoordinator: { name: string; phone: string; email: string };
  /** Accessibility of the physical store(s): entrance, parking, service counter, etc. */
  storeAccessibility: string;
  shipping: { areas: string; deliveryTime: string; cost: string; pickup: string };
  /** Last time each document was reviewed (ISO date). */
  updated: { accessibility: string; terms: string; privacy: string; cancellation: string; shipping: string };
};

export type Hero = {
  eyebrow: string;
  title: string;
  text: string;
  primary: Link;
  secondary: Link;
  note: string;
  sticker: { show: boolean; badge: string; text: string; price: string; suffix: string };
};

export type CategoryCard = { title: string; image: string; href: string };
export type ThemeCard = { title: string; subtitle: string; image: string; href: string };

export type TierTone = 'neutral' | 'brand' | 'ink';
export type Tier = {
  id: string;
  name: string;
  guests: string;
  /** Shekels, VAT included, digits only (e.g. "149") */
  price: string;
  /** The real price before the discount; leave empty when there is no discount */
  oldPrice: string;
  items: string[];
  cta: string;
  featured: boolean;
  tone: TierTone;
};

/** A shop category: its own page at /category/<id>, and a link in the navbar. */
export type Category = {
  /** The page address: lowercase English letters, digits and dashes ("balloons") */
  id: string;
  name: string;
  description: string;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  /** Shekels, VAT included, digits only. Empty = not for sale (not shown) */
  price: string;
  /** The real price before a discount; empty when there is none */
  oldPrice: string;
  image: string;
  /**
   * How many may still be bought, filled in by the server from its stock records
   * (capped at 20). "" = stock isn't tracked; "0" = sold out. Edited in the admin's
   * product card, which saves it straight to the server, not to the draft.
   */
  stock: string;
};

export type CheckoutSettings = {
  deliveryEnabled: boolean;
  /** Shekels; "0" = free delivery. Delivery is offered only once this is set. */
  deliveryFee: string;
  pickupEnabled: boolean;
  /** Most installments a customer may choose on the payment page (1 = none) */
  maxPayments: number;
};

export type SiteContent = {
  version: 1;
  business: Business;
  catalog: { categories: Category[]; products: Product[] };
  hero: Hero;
  categories: { items: CategoryCard[] };
  themes: { title: string; subtitle: string; allLink: Link; items: ThemeCard[] };
  packages: { title: string; badge: string; text: string; featuredLabel: string; tiers: Tier[] };
  footer: { tagline: string; description: string; secureLabel: string };
  checkout: CheckoutSettings;
};
