"""Checks a content document before it is stored."""

import json
import re

from django.conf import settings


class ContentError(ValueError):
    """The message is shown to the owner in the admin panel, so it is in Hebrew."""


LINK_PREFIXES = ('#', '/', 'http://', 'https://', 'mailto:', 'tel:')


def _image_allowed(url: str) -> bool:
    # The site's own files (uploads, /2.png…), or an approved external host (settings.CONTENT_IMAGE_HOSTS).
    # Any other host would learn the IP of every visitor, and the CSP blocks it anyway.
    if url.startswith('/') and not url.startswith('//'):
        return True
    return any(url.startswith(f'https://{host}/') for host in settings.CONTENT_IMAGE_HOSTS)


def _check_urls(value, path=''):
    if isinstance(value, dict):
        for key, child in value.items():
            here = f'{path}.{key}' if path else key
            if isinstance(child, str) and key in ('href', 'image'):
                url = child.strip()
                if key == 'href' and url and not url.lower().startswith(LINK_PREFIXES):
                    raise ContentError(f'קישור לא תקין ב-{here}: "{url[:60]}". מותר להתחיל ב-# , / , https:// , mailto: או tel:')
                if key == 'image' and url and not _image_allowed(url):
                    raise ContentError(f'תמונה מאתר חיצוני ב-{here}. מעלים את התמונה דרך כפתור ההעלאה, כדי שפרטי הגולשים לא יועברו לאתרים אחרים.')
            else:
                _check_urls(child, here)
    elif isinstance(value, list):
        for i, child in enumerate(value):
            _check_urls(child, f'{path}[{i}]')


def validate_content(data) -> dict:
    if not isinstance(data, dict) or data.get('version') != 1:
        raise ContentError('הקובץ אינו קובץ תוכן של האתר.')
    size = len(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    if size > settings.CONTENT_MAX_BYTES:
        raise ContentError('התוכן גדול מדי. אם יש בו תמונות שהוטמעו בקובץ, העלו אותן מחדש דרך כפתור העלאת התמונה.')
    # Rejects javascript: links, inline data: images and images from unapproved sites.
    _check_urls(data)
    # A username only: the site builds the instagram.com link itself.
    instagram = (data.get('business') or {}).get('instagram', '')
    if not isinstance(instagram, str) or not INSTAGRAM_HANDLE.fullmatch(instagram):
        raise ContentError('שם המשתמש באינסטגרם לא תקין. רק אותיות באנגלית, ספרות, נקודה וקו תחתון, עד 30 תווים.')
    _check_catalog(data)
    return data


INSTAGRAM_HANDLE = re.compile(r'[A-Za-z0-9._]{0,30}')
# Shekels with up to 2 decimals, or empty (not for sale yet).
PRICE = re.compile(r'(?:\d{1,6}(?:\.\d{1,2})?)?')
CATEGORY_ID = re.compile(r'[a-z0-9][a-z0-9-]{0,39}')
ITEM_ID = re.compile(r'[A-Za-z0-9_-]{1,40}')


def _list(value, name):
    if not isinstance(value, list):
        raise ContentError(f'{name}: מבנה לא תקין.')
    return value


def _unique_ids(items, pattern, what, hint):
    seen = set()
    for item in items:
        if not isinstance(item, dict):
            raise ContentError(f'{what}: מבנה לא תקין.')
        item_id = item.get('id')
        if not isinstance(item_id, str) or not pattern.fullmatch(item_id):
            raise ContentError(f'{what}: המזהה "{str(item_id)[:40]}" לא תקין. {hint}')
        if item_id in seen:
            raise ContentError(f'{what}: המזהה "{item_id}" מופיע פעמיים. לכל אחד צריך מזהה משלו.')
        seen.add(item_id)


def _price(value, where):
    if not isinstance(value, str) or not PRICE.fullmatch(value):
        raise ContentError(f'מחיר לא תקין ב{where}: "{str(value)[:20]}". רק ספרות, למשל 49 או 49.90.')


def _check_catalog(data):
    """Everything that ends up in a payment: ids the server prices by, and the prices themselves."""
    catalog = data.get('catalog')
    if catalog is not None:
        if not isinstance(catalog, dict):
            raise ContentError('קטלוג המוצרים: מבנה לא תקין.')
        categories = _list(catalog.get('categories', []), 'קטגוריות')
        products = _list(catalog.get('products', []), 'מוצרים')
        if len(categories) > 40 or len(products) > 1000:
            raise ContentError('יותר מדי קטגוריות או מוצרים.')
        _unique_ids(categories, CATEGORY_ID, 'קטגוריה', 'כתובת העמוד: אותיות באנגלית קטנות, ספרות ומקף, למשל balloons.')
        _unique_ids(products, ITEM_ID, 'מוצר', 'אותיות באנגלית, ספרות, מקף וקו תחתון.')
        for p in products:
            name = p.get('name') or p.get('id')
            _price(p.get('price', ''), f'מוצר "{name}"')
            _price(p.get('oldPrice', ''), f'מוצר "{name}" (מחיר לפני הנחה)')

    tiers = _list(((data.get('packages') or {}).get('tiers', [])), 'חבילות')
    _unique_ids(tiers, ITEM_ID, 'חבילה', 'אותיות באנגלית, ספרות, מקף וקו תחתון.')
    for t in tiers:
        _price(t.get('price', ''), f'חבילה "{t.get("name") or t.get("id")}"')
        _price(t.get('oldPrice', ''), f'חבילה "{t.get("name") or t.get("id")}" (מחיר לפני הנחה)')

    checkout = data.get('checkout')
    if checkout is not None:
        if not isinstance(checkout, dict):
            raise ContentError('הגדרות התשלום: מבנה לא תקין.')
        _price(checkout.get('deliveryFee', ''), 'דמי המשלוח')
        payments = checkout.get('maxPayments', 1)
        if not isinstance(payments, int) or isinstance(payments, bool) or not 1 <= payments <= 12:
            raise ContentError('מספר התשלומים המרבי צריך להיות בין 1 ל-12.')
