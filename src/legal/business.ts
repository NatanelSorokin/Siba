/**
 * Business details shown across the site and in the legal pages.
 *
 * Israeli law requires several of these to appear on a site that sells online
 * (Consumer Protection Law §14ג: name, ID/company number and address of the
 * business; the accessibility regulations: an accessibility coordinator's
 * contact details). Empty strings are rendered as a visible "יש להשלים"
 * marker, and listed by the development-only checklist, so that a missing
 * legal detail is never silently left out.
 *
 * Fill in every empty value before going live.
 */

export const business = {
  tradeName: 'סיבה למסיבה',
  legalName: 'סיבה למסיבה בע"מ',
  /** ח.פ. / ע.מ. */
  companyId: '',
  /** Street, number, city */
  address: '',
  phone: '03-5551234',
  phoneHref: '+97235551234',
  email: '',
  domain: 'siba-lmesiba.co.il',

  hours: [
    { days: "ימים א'-ה'", time: '08:30 - 20:00' },
    { days: "יום ו' וערבי חג", time: '08:30 - 14:00' },
    { days: 'מוקד וואטסאפ', time: 'מענה תוך שעתיים' },
  ],

  paymentMethods: ['כרטיס אשראי', 'ביט', 'Apple Pay'],

  accessibilityCoordinator: {
    name: '',
    phone: '',
    email: '',
  },
  /** Accessibility of the physical store(s): entrance, parking, service counter, etc. */
  storeAccessibility: '',

  shipping: {
    /** e.g. "משלוח עד הבית לכל הארץ, למעט אילת והתנחלויות" */
    areas: '',
    /** e.g. "עד 5 ימי עסקים ממועד ההזמנה" */
    deliveryTime: '',
    /** e.g. "29.90 ₪, ללא עלות בהזמנה מעל 299 ₪" */
    cost: '',
    /** e.g. "איסוף עצמי ללא עלות מהחנות, בתיאום מראש" */
    pickup: '',
  },

  /** Last time each document was reviewed (ISO date). */
  updated: {
    accessibility: '2026-11-24',
    terms: '2026-11-24',
    privacy: '2026-11-24',
    cancellation: '2026-11-24',
    shipping: '2026-11-24',
  },
};

/** Human-readable list of required details that are still empty. */
export function missingDetails(): string[] {
  const b = business;
  const checks: [string, string][] = [
    [b.companyId, 'מספר ח.פ. / ע.מ. של העסק'],
    [b.address, 'כתובת העסק'],
    [b.email, 'כתובת דוא"ל לפניות'],
    [b.accessibilityCoordinator.name, 'שם רכז/ת הנגישות'],
    [b.accessibilityCoordinator.phone, 'טלפון רכז/ת הנגישות'],
    [b.accessibilityCoordinator.email, 'דוא"ל רכז/ת הנגישות'],
    [b.storeAccessibility, 'הסדרי נגישות בחנות הפיזית'],
    [b.shipping.areas, 'אזורי משלוח'],
    [b.shipping.deliveryTime, 'זמני אספקה'],
    [b.shipping.cost, 'עלות משלוח'],
  ];
  return checks.filter(([value]) => !value.trim()).map(([, label]) => label);
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
