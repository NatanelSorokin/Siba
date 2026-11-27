"""
E-mail to the owner when an order is paid.

The message says what was ordered, for how much, and links to the admin panel. It holds
no customer details (name, phone, e-mail, address): mailboxes get forwarded, synced and
breached, so personal details stay in the admin panel, behind the login.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import Order, ShopSettings

log = logging.getLogger(__name__)


def email_ready() -> bool:
    """An SMTP server is configured (in development, mail is printed to the console instead)."""
    return bool(settings.EMAIL_HOST) or settings.DEV_MODE


def _money(value) -> str:
    return f'₪{value:,.2f}'.replace('.00', '')


def new_order_message(order: Order) -> tuple[str, str]:
    lines = [f'{line["name"]} × {line["qty"]}   {_money(float(line["lineTotal"]))}' for line in order.items]
    delivery = 'משלוח' if order.delivery_method == Order.DELIVERY else 'איסוף עצמי'
    if order.delivery_fee:
        delivery += f' ({_money(float(order.delivery_fee))})'
    payments = f', ב-{order.num_payments} תשלומים' if order.num_payments and order.num_payments > 1 else ''
    link = f'{settings.SITE_URL}/admin/orders' if settings.SITE_URL else '/admin/orders'
    subject = f'הזמנה חדשה באתר: {order.number}, {_money(float(order.total))}'
    body = '\n'.join(
        [
            f'התקבלה הזמנה חדשה ששולמה באתר, מספר {order.number}.',
            '',
            *lines,
            delivery,
            f'סה"כ שולם: {_money(float(order.total))}{payments}',
            '',
            'פרטי הלקוח ולטיפול בהזמנה, בפאנל הניהול:',
            link,
            '',
            'פרטי הלקוח לא נכללים במייל הזה, כדי שלא יישמרו בתיבת הדואר.',
        ]
    )
    return subject, body


def notify_new_order(order: Order) -> bool:
    """Sends the notice; never raises, so a mail problem can't affect the order."""
    to = ShopSettings.load().notify_email
    if not to or not email_ready():
        return False
    subject, body = new_order_message(order)
    try:
        send_mail(subject, body, None, [to], fail_silently=False)
        return True
    except Exception as e:  # SMTP down, bad credentials…: log it, the order is safe in the admin panel
        log.error('New-order e-mail for order %s failed: %s', order.number, type(e).__name__)
        return False


def send_test(to: str) -> None:
    send_mail(
        'בדיקה: התראות הזמנות מהאתר',
        'אם המייל הזה הגיע, התראות על הזמנות חדשות יישלחו לכתובת הזו.',
        None,
        [to],
        fail_silently=False,
    )
