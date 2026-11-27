"""
Checkout: turns a cart into an order, priced by the server.

The browser sends only product ids and quantities. Names and prices come from
the published content, so a tampered request can't change what is charged.
"""

import re
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils import timezone

from .models import Order, ProductStock

# Most of one item per order (the cart's limit too).
MAX_QTY = 20


class OrderError(ValueError):
    """Shown to the customer, so in Hebrew."""


PHONE = re.compile(r'[0-9+\-\s()]{9,20}')


def checkout_settings(content: dict) -> dict:
    c = content.get('checkout') if isinstance(content.get('checkout'), dict) else {}
    fee = _decimal(c.get('deliveryFee', ''))
    payments = c.get('maxPayments', 1)
    return {
        # Delivery is offered only once it has a price (0 = free).
        'delivery': bool(c.get('deliveryEnabled')) and fee is not None,
        'deliveryFee': fee if fee is not None else Decimal('0'),
        'pickup': bool(c.get('pickupEnabled', True)),
        'maxPayments': payments if isinstance(payments, int) and 1 <= payments <= 12 else 1,
    }


def _decimal(value):
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        d = Decimal(value.strip())
    except InvalidOperation:
        return None
    return d.quantize(Decimal('0.01')) if d.is_finite() and d >= 0 else None


def price_list(content: dict, stock: dict | None = None) -> dict:
    """
    Everything that can be bought, by cart id: {"package:basic": (name, price, left)}.
    `left` is how many are in stock, or None when stock isn't tracked.
    """
    stock = ProductStock.as_map() if stock is None else stock
    items = {}
    for tier in (content.get('packages') or {}).get('tiers', []):
        price = _decimal(tier.get('price', ''))
        if isinstance(tier, dict) and price and price > 0:
            items[f'package:{tier.get("id")}'] = (str(tier.get('name') or 'חבילה'), price, None)
    catalog = content.get('catalog') or {}
    categories = {c.get('id') for c in catalog.get('categories', []) if isinstance(c, dict)}
    for p in catalog.get('products', []):
        if not isinstance(p, dict) or p.get('categoryId') not in categories:
            continue
        price = _decimal(p.get('price', ''))
        if price and price > 0:
            items[f'product:{p.get("id")}'] = (str(p.get('name') or 'מוצר'), price, stock.get(p.get('id')))
    return items


def with_stock(content: dict, stock: dict | None = None) -> dict:
    """
    The content as visitors get it: each product carries "stock", how many may still be
    bought ("" = not tracked). Capped at MAX_QTY, so the real stock level stays private.
    """
    stock = ProductStock.as_map() if stock is None else stock
    catalog = content.get('catalog')
    if not isinstance(catalog, dict):
        return content
    products = [
        {**p, 'stock': str(min(stock[p.get('id')], MAX_QTY)) if p.get('id') in stock else ''} if isinstance(p, dict) else p
        for p in catalog.get('products', [])
    ]
    return {**content, 'catalog': {**catalog, 'products': products}}


def take_from_stock(order: Order):
    """A paid order's products leave the stock (never below 0)."""
    from django.db.models import F
    from django.db.models.functions import Greatest

    for line in order.items:
        if line['id'].startswith('product:'):
            ProductStock.objects.filter(pk=line['id'].split(':', 1)[1]).update(quantity=Greatest(F('quantity') - line['qty'], 0))


def _text(data, key, max_len, required=True, label=''):
    value = data.get(key, '')
    if not isinstance(value, str):
        raise OrderError('הבקשה לא תקינה.')
    value = ' '.join(value.split())  # one line, no control characters
    if required and not value:
        raise OrderError(f'נא למלא {label}.')
    if len(value) > max_len:
        raise OrderError(f'{label} ארוך מדי.')
    return value


def build_order(data: dict, content: dict) -> Order:
    """Validates the checkout form and cart, and returns an unsaved, priced order."""
    if not isinstance(data, dict):
        raise OrderError('הבקשה לא תקינה.')
    if data.get('acceptedTerms') is not True:
        raise OrderError('כדי להזמין צריך לאשר את התקנון ואת מדיניות הפרטיות.')

    lines = data.get('items')
    if not isinstance(lines, list) or not lines:
        raise OrderError('הסל ריק.')
    if len(lines) > settings.MAX_ORDER_LINES:
        raise OrderError('יותר מדי פריטים בהזמנה אחת.')

    prices = price_list(content)
    merged = {}
    for line in lines:
        if not isinstance(line, dict) or not isinstance(line.get('id'), str):
            raise OrderError('הבקשה לא תקינה.')
        qty = line.get('qty')
        if not isinstance(qty, int) or isinstance(qty, bool) or not 1 <= qty <= 20:
            raise OrderError('כמות לא תקינה בסל.')
        if line['id'] not in prices:
            raise OrderError('אחד המוצרים בסל כבר לא זמין. הסירו אותו מהסל ונסו שוב.')
        merged[line['id']] = min(MAX_QTY, merged.get(line['id'], 0) + qty)

    items, subtotal = [], Decimal('0')
    for item_id, qty in merged.items():
        name, price, left = prices[item_id]
        if left is not None and qty > left:
            raise OrderError(f'"{name}" אזל מהמלאי.' if left == 0 else f'מ"{name}" נשארו רק {left} יחידות. עדכנו את הכמות בסל.')
        total = price * qty
        subtotal += total
        items.append({'id': item_id, 'name': name, 'unitPrice': str(price), 'qty': qty, 'lineTotal': str(total)})

    customer = data.get('customer') if isinstance(data.get('customer'), dict) else {}
    name = _text(customer, 'name', 80, label='שם מלא')
    phone = _text(customer, 'phone', 20, label='טלפון')
    if not PHONE.fullmatch(phone) or len(re.sub(r'\D', '', phone)) < 9:
        raise OrderError('מספר הטלפון לא תקין.')
    email = _text(customer, 'email', 120, label='כתובת דוא"ל')
    try:
        validate_email(email)
    except ValidationError:
        raise OrderError('כתובת הדוא"ל לא תקינה.') from None

    options = checkout_settings(content)
    delivery = data.get('delivery') if isinstance(data.get('delivery'), dict) else {}
    method = delivery.get('method')
    if method == Order.DELIVERY and options['delivery']:
        address = _text(delivery, 'address', 120, label='כתובת למשלוח')
        city = _text(delivery, 'city', 60, label='עיר')
        fee = options['deliveryFee']
    elif method == Order.PICKUP and options['pickup']:
        address, city, fee = '', '', Decimal('0')
    else:
        raise OrderError('נא לבחור משלוח או איסוף עצמי.')
    notes = _text(data, 'notes', 500, required=False, label='הערות')

    return Order(
        items=items,
        subtotal=subtotal,
        delivery_fee=fee,
        total=subtotal + fee,
        delivery_method=method,
        customer_name=name,
        customer_phone=phone,
        customer_email=email,
        address=address,
        city=city,
        notes=notes,
    )


def rate_limited(ip: str) -> bool:
    """True once this IP started more checkouts than allowed in the window."""
    key = f'orders:ip:{ip}'
    if cache.add(key, 1, settings.ORDER_RATE_WINDOW_SECONDS):
        return False
    try:
        return cache.incr(key) > settings.ORDER_RATE_LIMIT
    except ValueError:
        cache.set(key, 1, settings.ORDER_RATE_WINDOW_SECONDS)
        return False


def purge_unpaid():
    """Unpaid orders past the retention period: their personal details aren't needed anymore."""
    cutoff = timezone.now() - timedelta(days=settings.UNPAID_ORDER_RETENTION_DAYS)
    Order.objects.filter(status__in=[Order.PENDING, Order.FAILED, Order.CANCELLED], created_at__lt=cutoff).delete()
