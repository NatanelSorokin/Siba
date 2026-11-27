/**
 * Helpers for the business details shown across the site and in the legal pages.
 * The details themselves are site content: edit them in the admin panel
 * (/admin → פרטי העסק), stored in src/content/site-content.json.
 *
 * Israeli law requires several of them to appear on a site that sells online
 * (Consumer Protection Law §14ג: name, ID/company number and address of the
 * business; the accessibility regulations: an accessibility coordinator's
 * contact details). Empty values are rendered as a visible "יש להשלים"
 * marker and listed by `missingDetails`, so a missing legal detail is never
 * silently left out.
 */

import type { Business } from '../content/types';

export type { Business };

/** Required details that are still empty, as [path, label] pairs (path is used by the admin panel). */
export function missingFields(b: Business): { field: string; label: string }[] {
  const checks: [string, string, string][] = [
    [b.companyId, 'companyId', 'מספר ח.פ. / ע.מ. של העסק'],
    [b.address, 'address', 'כתובת העסק'],
    [b.email, 'email', 'כתובת דוא"ל לפניות'],
    [b.accessibilityCoordinator.name, 'coordinatorName', 'שם רכז/ת הנגישות'],
    [b.accessibilityCoordinator.phone, 'coordinatorPhone', 'טלפון רכז/ת הנגישות'],
    [b.accessibilityCoordinator.email, 'coordinatorEmail', 'דוא"ל רכז/ת הנגישות'],
    [b.storeAccessibility, 'storeAccessibility', 'הסדרי נגישות בחנות הפיזית'],
    [b.shipping.areas, 'shippingAreas', 'אזורי משלוח'],
    [b.shipping.deliveryTime, 'shippingTime', 'זמני אספקה'],
    [b.shipping.cost, 'shippingCost', 'עלות משלוח'],
  ];
  return checks.filter(([value]) => !value.trim()).map(([, field, label]) => ({ field, label }));
}

export const missingDetails = (b: Business) => missingFields(b).map((m) => m.label);

/** Instagram username, from whatever was pasted: "@siba", "siba" or a profile link. */
export function instagramHandle(input: string): string {
  return input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#\s].*$/, '')
    .replace(/[^A-Za-z0-9._]/g, '')
    .slice(0, 30);
}

export const instagramUrl = (handle: string) => `https://www.instagram.com/${encodeURIComponent(handle)}/`;

/** "03-555 1234" → "+97235551234", for tel: links. */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return `+${digits}`;
  if (digits.startsWith('0')) return `+972${digits.slice(1)}`;
  return digits;
}

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
};
