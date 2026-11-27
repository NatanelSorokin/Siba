"""
Cardcom payments, through Cardcom's hosted payment page (API v11 "LowProfile").

The flow, and why it keeps card details away from the site:
1. create_payment_page(): the server asks Cardcom for a one-time payment page for
   the order's amount, and sends the customer's browser there.
2. The customer types the card on Cardcom's own page (Isracard, Visa, Mastercard,
   Diners, Amex, Bit, Apple Pay, Google Pay, installments, per the terminal's setup).
   The card never passes through, and is never stored by, this site.
3. Cardcom sends the browser back, and calls our webhook. Neither is trusted:
   get_result() asks Cardcom directly, and verify() checks the answer matches the
   order (terminal, amount, page id) before the order is marked paid.

Reference: https://secure.cardcom.solutions/swagger/v11/swagger.json
"""

import json
import urllib.error
import urllib.request
from decimal import Decimal, InvalidOperation
from urllib.parse import urlsplit

from django.conf import settings


class PaymentError(Exception):
    """Cardcom couldn't be reached, or refused the request. Message is for logs, not customers."""


# Cardcom's own domains. The payment page address comes back from Cardcom's API; the
# browser is only ever sent to one of these, so a bad answer can't redirect customers elsewhere.
CARDCOM_DOMAINS = ('cardcom.solutions', 'cardcom.co.il')


def configured() -> bool:
    return bool(settings.CARDCOM_TERMINAL and settings.CARDCOM_API_NAME)


def _terminal() -> int:
    return int(settings.CARDCOM_TERMINAL)


def _post(path: str, payload: dict) -> dict:
    """POST JSON to Cardcom and return its JSON answer."""
    request = urllib.request.Request(
        f'{settings.CARDCOM_BASE_URL}{path}',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(request, timeout=settings.CARDCOM_TIMEOUT_SECONDS) as response:
            body = response.read(1_000_000)
    except urllib.error.HTTPError as e:
        raise PaymentError(f'Cardcom answered HTTP {e.code} on {path}') from None
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise PaymentError(f'Cardcom unreachable on {path}: {type(e).__name__}') from None
    try:
        data = json.loads(body)
    except ValueError:
        raise PaymentError(f'Cardcom sent a non-JSON answer on {path}') from None
    if not isinstance(data, dict):
        raise PaymentError(f'Cardcom sent an unexpected answer on {path}')
    return data


def is_payment_page_url(url: str) -> bool:
    """True for an https address on Cardcom's domains (or on the configured API host, for tests)."""
    if not isinstance(url, str):
        return False
    parts = urlsplit(url)
    host = (parts.hostname or '').lower()
    base = urlsplit(settings.CARDCOM_BASE_URL)
    if parts.scheme == base.scheme and host == (base.hostname or '').lower() and parts.port == base.port:
        return True
    return parts.scheme == 'https' and any(host == d or host.endswith(f'.{d}') for d in CARDCOM_DOMAINS)


def money(value: Decimal) -> float:
    return float(value.quantize(Decimal('0.01')))


def create_payment_page(order, site_url: str, max_payments: int) -> tuple[str, str]:
    """Opens a Cardcom payment page for the order. Returns (LowProfileId, page address)."""
    order_page = f'{site_url}/order/{order.token}'
    payload = {
        'TerminalNumber': _terminal(),
        'ApiName': settings.CARDCOM_API_NAME,
        'Operation': 'ChargeOnly',
        'Amount': money(order.total),
        'ISOCoinId': 1,  # shekels
        'Language': 'he',
        'ProductName': f'הזמנה {order.number}',
        'ReturnValue': f'order-{order.pk}',
        'SuccessRedirectUrl': order_page,
        'FailedRedirectUrl': f'{order_page}?failed=1',  # a hint for the page; the order's state comes from Cardcom
        'CancelRedirectUrl': f'{site_url}/checkout',
        'WebHookUrl': f'{site_url}/api/payments/cardcom/webhook/',
        # Fills in what the customer already typed at checkout; they can still change it.
        'UIDefinition': {
            'CardOwnerNameValue': order.customer_name[:50],
            'CardOwnerPhoneValue': order.customer_phone[:50],
            'CardOwnerEmailValue': order.customer_email[:50],
        },
        'AdvancedDefinition': {'MinNumOfPayments': 1, 'MaxNumOfPayments': max(1, min(12, max_payments))},
    }
    if settings.CARDCOM_CREATE_DOCUMENT:
        products = [
            {'Description': line['name'][:250], 'UnitCost': float(line['unitPrice']), 'Quantity': line['qty']} for line in order.items
        ]
        if order.delivery_fee > 0:
            products.append({'Description': 'משלוח', 'UnitCost': money(order.delivery_fee), 'Quantity': 1})
        payload['Document'] = {
            'Name': order.customer_name[:50],
            'Email': order.customer_email[:50],
            'Mobile': order.customer_phone[:50],
            'IsSendByEmail': True,
            'Products': products,
        }

    data = _post('/api/v11/LowProfile/Create', payload)
    if data.get('ResponseCode') != 0:
        raise PaymentError(f'Create refused: code {data.get("ResponseCode")}')
    lowprofile_id, url = str(data.get('LowProfileId') or ''), data.get('Url')
    if not lowprofile_id or not is_payment_page_url(url):
        raise PaymentError('Create answered without a valid payment page')
    return lowprofile_id, url


def get_result(lowprofile_id: str) -> dict:
    return _post(
        '/api/v11/LowProfile/GetLpResult',
        {'TerminalNumber': _terminal(), 'ApiName': settings.CARDCOM_API_NAME, 'LowProfileId': lowprofile_id},
    )


def verify(order, result: dict) -> dict:
    """
    Reads Cardcom's result for the order's payment page.
    Returns {'paid': bool, 'final': bool, ...details}. `final` is False while the
    customer may still be on the payment page (nothing charged yet).
    """
    if str(result.get('LowProfileId', '')).lower() != order.lowprofile_id.lower():
        return {'paid': False, 'final': False, 'error': 'page id mismatch'}
    if result.get('TerminalNumber') not in (None, _terminal()):
        return {'paid': False, 'final': True, 'error': 'terminal mismatch'}

    deal = result.get('TranzactionInfo')
    if result.get('ResponseCode') != 0 or not isinstance(deal, dict):
        # No transaction yet: the page is still open, or the card was declined there.
        code = result.get('ResponseCode')
        return {'paid': False, 'final': False, 'error': f'code {code}' if code not in (None, 0) else ''}
    if deal.get('ResponseCode') != 0:
        return {'paid': False, 'final': True, 'error': str(deal.get('Description') or deal.get('ResponseCode'))[:250]}
    try:
        amount = Decimal(str(deal.get('Amount')))
    except (InvalidOperation, ValueError):
        return {'paid': False, 'final': True, 'error': 'amount unreadable'}
    if amount.quantize(Decimal('0.01')) != order.total.quantize(Decimal('0.01')):
        return {'paid': False, 'final': True, 'error': f'amount mismatch ({amount})'}
    if deal.get('CoinId') not in (None, 1):
        return {'paid': False, 'final': True, 'error': 'currency mismatch'}

    last4 = str(deal.get('Last4CardDigitsString') or deal.get('Last4CardDigits') or '')[-4:]
    payments = deal.get('NumberOfPayments')
    return {
        'paid': True,
        'final': True,
        'transaction_id': str(deal.get('TranzactionId') or result.get('TranzactionId') or '')[:32],
        'approval_number': str(deal.get('ApprovalNumber') or '')[:32],
        'card_last4': last4 if last4.isdigit() else '',
        'num_payments': payments if isinstance(payments, int) and 0 < payments < 100 else None,
    }
