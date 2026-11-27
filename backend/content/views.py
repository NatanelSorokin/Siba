"""
JSON API for the React site and its admin panel.

Public:   GET  /api/content/                 published content
Auth:     GET  /api/auth/session/            who is signed in (also sets the CSRF cookie)
          POST /api/auth/login/              {username, password}
          POST /api/auth/logout/
Admin:    GET  /api/admin/content/           draft + published + status
          PUT  /api/admin/content/           {draft}: autosave
          POST /api/admin/publish/           draft → published
          POST /api/admin/discard/           published → draft
          POST /api/admin/images/            multipart "file" → {url}
          GET  /api/admin/orders/            the latest orders, with customer details
          POST /api/admin/orders/<id>/       {status}: mark shipped / cancelled
          GET  /api/admin/payments/          is online payment set up
Checkout: GET  /api/checkout/                which options are on (no personal data)
          POST /api/orders/                  cart + details → Cardcom payment page address
          GET  /api/orders/<token>/          the order's status (no personal data)
          POST /api/payments/cardcom/webhook/  Cardcom's notice; checked with Cardcom itself

Every unsafe request needs the X-CSRFToken header (Django's CSRF protection),
and admin endpoints need a signed-in staff user. The checkout endpoints are the
exception: visitors get no cookies, so there is no CSRF token to send, and they
act on no one's session (an order is only a request to pay).
"""

import io
import json
import logging
import re
import uuid
import warnings
from functools import wraps

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.validators import validate_email
from django.db import transaction
from django.http import Http404, HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.html import json_script
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from PIL import Image, ImageOps, UnidentifiedImageError

from . import cardcom, throttle
from .models import Order, ProductStock, ShopSettings, SiteContent, UploadedImage
from .notifications import email_ready, notify_new_order, send_test
from .orders import OrderError, build_order, checkout_settings, purge_unpaid, rate_limited, take_from_stock, with_stock
from .validation import ContentError, validate_content

log = logging.getLogger(__name__)


def error(message, status):
    return JsonResponse({'error': message}, status=status)


def read_json(request):
    try:
        return json.loads(request.body or b'{}')
    except (ValueError, UnicodeDecodeError):
        return None


def staff_required(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return error('צריך להתחבר מחדש.', 401)
        if not (request.user.is_active and request.user.is_staff):
            return error('למשתמש הזה אין הרשאה לנהל את האתר.', 403)
        return view(request, *args, **kwargs)

    return wrapper


def session_payload(request):
    user = request.user
    signed_in = user.is_authenticated and user.is_active and user.is_staff
    return {'authenticated': signed_in, 'username': user.get_username() if signed_in else None}


def content_status(obj: SiteContent):
    return {
        'draft': obj.draft,
        'published': obj.published,
        'hasUnpublishedChanges': obj.has_unpublished_changes,
        'updatedAt': obj.updated_at.isoformat() if obj.updated_at else None,
        'updatedBy': obj.updated_by.get_username() if obj.updated_by else None,
        'publishedAt': obj.published_at.isoformat() if obj.published_at else None,
        'publishedBy': obj.published_by.get_username() if obj.published_by else None,
    }


# --------------------------------------------------------------------------- public


@require_GET
def public_content(request):
    response = JsonResponse(with_stock(SiteContent.load().published), json_dumps_params={'ensure_ascii': False})
    response['Cache-Control'] = 'no-cache'
    return response


@never_cache
def index(request, status=200):
    """
    The built site for any of its addresses (/, /terms, /admin/hero…), with the
    published content inlined: no extra request, no flash of old content.
    """
    page = settings.FRONTEND_DIST / 'index.html'
    if not page.is_file():
        raise Http404('The site has not been built yet: run "npm run build".')
    html = page.read_text(encoding='utf-8')
    published = SiteContent.load().published
    category = re.match(r'^/category/([a-z0-9-]+)/?$', request.path)
    if category and not any(c.get('id') == category[1] for c in (published.get('catalog') or {}).get('categories', [])):
        status = 404  # a category that doesn't exist (anymore)
    inline = str(json_script(with_stock(published), 'site-content'))
    response = HttpResponse(html.replace('</head>', f'{inline}\n</head>', 1), status=status)
    if request.path.startswith(('/admin', '/checkout', '/order/')):
        # The sign-in page and customers' order pages stay out of search results.
        response['X-Robots-Tag'] = 'noindex, nofollow'
    return response


def not_found(request, path=''):
    """Unknown address: the site's own "page not found" screen, with a real 404 status."""
    return index(request, status=404)


# --------------------------------------------------------------------------- auth


@never_cache
@ensure_csrf_cookie
@require_GET
def session(request):
    return JsonResponse(session_payload(request))


@never_cache
@require_POST
def login_view(request):
    data = read_json(request)
    if not isinstance(data, dict):
        return error('בקשה לא תקינה.', 400)
    username = str(data.get('username', ''))[:150]
    password = str(data.get('password', ''))[:4096]
    if not username or not password:
        return error('נא למלא שם משתמש וסיסמה.', 400)

    if throttle.is_locked(request, username):
        minutes = settings.LOGIN_LOCKOUT_SECONDS // 60
        return error(f'יותר מדי ניסיונות כניסה. נסו שוב בעוד {minutes} דקות.', 429)

    # ThrottledModelBackend counts wrong passwords (here and in Django's own admin login).
    user = authenticate(request, username=username, password=password)
    # Same answer for a wrong password and for a valid user without admin rights,
    # so the form never confirms which usernames or passwords exist.
    if user is None or not user.is_staff:
        if user is not None:
            throttle.record_failure(request, username)
        return error('שם המשתמש או הסיסמה שגויים.', 400)

    login(request, user)
    return JsonResponse(session_payload(request))


@never_cache
@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({'authenticated': False, 'username': None})


# --------------------------------------------------------------------------- admin


def without_stock(draft):
    """Stock is kept apart (ProductStock), never in the content: drop any copy the editor sends back."""
    catalog = draft.get('catalog') if isinstance(draft, dict) else None
    if isinstance(catalog, dict) and isinstance(catalog.get('products'), list):
        for p in catalog['products']:
            if isinstance(p, dict):
                p.pop('stock', None)
    return draft


@never_cache
@require_http_methods(['GET', 'PUT'])
@staff_required
def admin_content(request):
    obj = SiteContent.load()
    if request.method == 'PUT':
        data = read_json(request)
        if not isinstance(data, dict) or 'draft' not in data:
            return error('בקשה לא תקינה.', 400)
        try:
            obj.draft = validate_content(without_stock(data['draft']))
        except ContentError as e:
            return error(str(e), 400)
        obj.updated_by = request.user
        obj.save()
    return JsonResponse(content_status(obj), json_dumps_params={'ensure_ascii': False})


@never_cache
@require_POST
@staff_required
def publish(request):
    obj = SiteContent.load()
    try:
        validate_content(obj.draft)
    except ContentError as e:
        return error(str(e), 400)
    obj.published = obj.draft
    obj.published_at = timezone.now()
    obj.published_by = request.user
    obj.save()
    return JsonResponse(content_status(obj), json_dumps_params={'ensure_ascii': False})


@never_cache
@require_POST
@staff_required
def discard(request):
    obj = SiteContent.load()
    obj.draft = obj.published
    obj.updated_by = request.user
    obj.save()
    return JsonResponse(content_status(obj), json_dumps_params={'ensure_ascii': False})


MAX_IMAGE_SIDE = 2000


@never_cache
@require_POST
@staff_required
def upload_image(request):
    upload = request.FILES.get('file')
    if upload is None:
        return error('לא נבחר קובץ.', 400)
    if upload.size > settings.IMAGE_MAX_BYTES:
        return error('התמונה גדולה מדי (עד 10MB).', 400)

    # Decode and re-encode every upload: strips metadata, normalises orientation and
    # size, and guarantees the stored file is a real image whatever was sent.
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            img = Image.open(upload)
            img.load()
        img = ImageOps.exif_transpose(img)
        if img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGBA' if 'A' in img.getbands() or img.mode == 'P' else 'RGB')
        img.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
        out = io.BytesIO()
        img.save(out, 'WEBP', quality=85, method=4)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        return error('הקובץ שנבחר אינו תמונה. אפשר להעלות JPG, PNG או WEBP.', 400)

    record = UploadedImage(original_name=upload.name[:255], uploaded_by=request.user)
    record.file.save(f'{uuid.uuid4().hex}.webp', ContentFile(out.getvalue()), save=True)
    return JsonResponse({'url': record.file.url}, status=201)


# --------------------------------------------------------------------------- checkout


def site_url(request) -> str | None:
    """
    The address Cardcom sends customers back to. In production it must be configured
    (SITE_URL): taking it from the request would let a forged Host header redirect them.
    """
    if settings.SITE_URL:
        # Customers come back to this address after paying: on a live site it must be https.
        return settings.SITE_URL if settings.DEV_MODE or settings.SITE_URL.startswith('https://') else None
    if settings.DEV_MODE:
        origin = request.headers.get('Origin', '')
        if origin in settings.CSRF_TRUSTED_ORIGINS:
            return origin
        return f'{request.scheme}://{request.get_host()}'
    return None


def payments_ready(request) -> bool:
    return cardcom.configured() and site_url(request) is not None


def order_status(order: Order):
    """What the customer's order page shows. Deliberately no name, phone, e-mail or address."""
    return {
        'number': order.number,
        # The owner's own steps (in preparation) are just "paid" to the customer.
        'status': Order.PAID if order.status == Order.PREPARING else order.status,
        'items': [{'name': i['name'], 'qty': i['qty'], 'lineTotal': i['lineTotal']} for i in order.items],
        'deliveryMethod': order.delivery_method,
        'deliveryFee': str(order.delivery_fee),
        'total': str(order.total),
        'numPayments': order.num_payments,
    }


def refresh_payment(order: Order) -> Order:
    """Asks Cardcom how the order's payment went, and records the answer. Safe to call repeatedly."""
    if order.status != Order.PENDING or not order.lowprofile_id or not cardcom.configured():
        return order
    try:
        outcome = cardcom.verify(order, cardcom.get_result(order.lowprofile_id))
    except cardcom.PaymentError as e:
        log.warning('Cardcom check failed for order %s: %s', order.number, e)
        return order
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.status != Order.PENDING:
            return order  # another request got here first
        if outcome['paid']:
            order.status = Order.PAID
            order.paid_at = timezone.now()
            order.transaction_id = outcome['transaction_id']
            order.approval_number = outcome['approval_number']
            order.card_last4 = outcome['card_last4']
            order.num_payments = outcome['num_payments']
            order.payment_error = ''
            take_from_stock(order)
            paid = order
            transaction.on_commit(lambda: notify_new_order(paid))
        elif outcome['final']:
            order.status = Order.FAILED
            order.payment_error = outcome.get('error', '')[:250]
            log.warning('Order %s payment rejected: %s', order.number, order.payment_error)
        else:
            return order
        order.save()
    return order


@never_cache
@require_GET
def checkout_options(request):
    options = checkout_settings(SiteContent.load().published)
    return JsonResponse(
        {
            'enabled': payments_ready(request),
            'delivery': options['delivery'],
            'deliveryFee': str(options['deliveryFee']),
            'pickup': options['pickup'],
            'maxPayments': options['maxPayments'],
        }
    )


@csrf_exempt
@never_cache
@require_POST
def create_order(request):
    # JSON only: a plain HTML form on another site can't send this content type.
    if request.content_type != 'application/json':
        return error('בקשה לא תקינה.', 415)
    if not payments_ready(request):
        return error('התשלום באתר עדיין לא מחובר. אפשר להזמין בטלפון.', 503)
    if rate_limited(throttle.client_ip(request)):
        return error('יותר מדי ניסיונות הזמנה. נסו שוב בעוד כמה דקות.', 429)

    content = SiteContent.load().published
    try:
        order = build_order(read_json(request), content)
    except OrderError as e:
        return error(str(e), 400)

    purge_unpaid()
    order.save()
    try:
        order.lowprofile_id, url = cardcom.create_payment_page(order, site_url(request), checkout_settings(content)['maxPayments'])
    except cardcom.PaymentError as e:
        log.error('Could not open a Cardcom payment page for order %s: %s', order.number, e)
        order.status = Order.FAILED
        order.payment_error = 'לא נפתח עמוד תשלום'
        order.save()
        return error('לא הצלחנו לפתוח את עמוד התשלום. נסו שוב בעוד רגע, או הזמינו בטלפון.', 502)
    order.save(update_fields=['lowprofile_id', 'updated_at'])
    return JsonResponse({'paymentUrl': url, 'token': order.token}, status=201)


ORDER_TOKEN = re.compile(r'[A-Za-z0-9_-]{20,64}')


@never_cache
@require_GET
def order_detail(request, token):
    order = Order.objects.filter(token=token).first() if ORDER_TOKEN.fullmatch(token) else None
    if order is None:
        return error('ההזמנה לא נמצאה.', 404)
    # Ask Cardcom at most every few seconds per order, however often the page polls.
    if order.status == Order.PENDING and cache.add(f'order-check:{order.pk}', 1, 3):
        order = refresh_payment(order)
    return JsonResponse(order_status(order), json_dumps_params={'ensure_ascii': False})


@csrf_exempt
@require_POST
def cardcom_webhook(request):
    """
    Cardcom's notice that a payment page was used. The notice itself isn't signed,
    so it is only a nudge: the result is read back from Cardcom's API before anything changes.
    """
    data = read_json(request)
    lowprofile_id = str(data.get('LowProfileId', ''))[:64] if isinstance(data, dict) else ''
    order = Order.objects.filter(lowprofile_id__iexact=lowprofile_id).first() if lowprofile_id else None
    # Repeated notices can't make the server hammer Cardcom: one check per order every few seconds.
    if order is not None and cache.add(f'order-check:{order.pk}', 1, 3):
        refresh_payment(order)
    return HttpResponse('OK')  # always 200, so Cardcom doesn't retry and nothing is revealed


# --------------------------------------------------------------------------- admin: orders


def order_admin_payload(order: Order):
    return {
        **order_status(order),
        'status': order.status,
        'id': order.pk,
        'createdAt': order.created_at.isoformat(),
        'paidAt': order.paid_at.isoformat() if order.paid_at else None,
        'subtotal': str(order.subtotal),
        'customer': {'name': order.customer_name, 'phone': order.customer_phone, 'email': order.customer_email},
        'address': order.address,
        'city': order.city,
        'notes': order.notes,
        'transactionId': order.transaction_id,
        'approvalNumber': order.approval_number,
        'cardLast4': order.card_last4,
        'paymentError': order.payment_error,
        'staffNote': order.staff_note,
    }


# Which status the owner may move an order to, from each status.
ADMIN_TRANSITIONS = {
    Order.PAID: {Order.PREPARING, Order.FULFILLED},
    Order.PREPARING: {Order.PAID, Order.FULFILLED},
    Order.FULFILLED: {Order.PREPARING, Order.PAID},
    Order.PENDING: {Order.CANCELLED},
    Order.FAILED: {Order.CANCELLED},
}


@never_cache
@require_GET
@staff_required
def admin_orders(request):
    # Orders still waiting (the customer may have closed the tab after paying) are checked as the owner looks.
    for order in Order.objects.filter(status=Order.PENDING).exclude(lowprofile_id='')[:20]:
        refresh_payment(order)
    orders = [order_admin_payload(o) for o in Order.objects.all()[:500]]
    return JsonResponse({'orders': orders}, json_dumps_params={'ensure_ascii': False})


@never_cache
@require_GET
@staff_required
def admin_orders_summary(request):
    """How many orders wait for the owner: for the badge on "הזמנות" and the overview."""
    return JsonResponse(
        {
            'new': Order.objects.filter(status=Order.PAID).count(),
            'preparing': Order.objects.filter(status=Order.PREPARING).count(),
        }
    )


@never_cache
@require_POST
@staff_required
def admin_order(request, order_id):
    order = Order.objects.filter(pk=order_id).first()
    if order is None:
        return error('ההזמנה לא נמצאה.', 404)
    data = read_json(request)
    if not isinstance(data, dict):
        return error('בקשה לא תקינה.', 400)
    fields = ['updated_at']
    if 'status' in data:
        if data['status'] not in ADMIN_TRANSITIONS.get(order.status, set()):
            return error('אי אפשר לשנות את ההזמנה לסטטוס הזה.', 400)
        order.status = data['status']
        fields.append('status')
    if 'staffNote' in data:
        note = data['staffNote']
        if not isinstance(note, str) or len(note) > 1000:
            return error('ההערה ארוכה מדי (עד 1,000 תווים).', 400)
        order.staff_note = note.strip()
        fields.append('staff_note')
    order.save(update_fields=fields)
    return JsonResponse(order_admin_payload(order), json_dumps_params={'ensure_ascii': False})


@never_cache
@require_GET
@staff_required
def admin_payments(request):
    return JsonResponse(
        {
            'configured': cardcom.configured(),
            'siteUrl': bool(settings.SITE_URL) or settings.DEV_MODE,
            'documents': settings.CARDCOM_CREATE_DOCUMENT,
            'ready': payments_ready(request),
        }
    )


@never_cache
@require_GET
@staff_required
def admin_stock(request):
    return JsonResponse({'stock': ProductStock.as_map()})


@never_cache
@require_POST
@staff_required
def admin_product_stock(request, product_id):
    """{"quantity": 12} sets the stock; {"quantity": null} stops tracking it."""
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,40}', product_id):
        return error('מזהה מוצר לא תקין.', 400)
    data = read_json(request)
    quantity = data.get('quantity') if isinstance(data, dict) else 'bad'
    if quantity is None:
        ProductStock.objects.filter(pk=product_id).delete()
    elif isinstance(quantity, int) and not isinstance(quantity, bool) and 0 <= quantity <= 99_999:
        ProductStock.objects.update_or_create(pk=product_id, defaults={'quantity': quantity})
    else:
        return error('כמות לא תקינה: מספר שלם בין 0 ל-99,999.', 400)
    return JsonResponse({'productId': product_id, 'quantity': quantity})



@never_cache
@require_http_methods(['GET', 'PUT'])
@staff_required
def admin_shop_settings(request):
    shop = ShopSettings.load()
    if request.method == 'PUT':
        data = read_json(request)
        email = data.get('notifyEmail', '') if isinstance(data, dict) else None
        if not isinstance(email, str):
            return error('בקשה לא תקינה.', 400)
        email = email.strip()
        if email:
            try:
                validate_email(email)
            except ValidationError:
                return error('כתובת הדוא"ל לא תקינה.', 400)
        shop.notify_email = email[:120]
        shop.save()
    return JsonResponse({'notifyEmail': shop.notify_email, 'emailReady': email_ready(), 'emailServer': bool(settings.EMAIL_HOST)})


@never_cache
@require_POST
@staff_required
def admin_test_email(request):
    to = ShopSettings.load().notify_email
    if not to:
        return error('קודם שומרים כתובת דוא"ל.', 400)
    if not email_ready():
        return error('שרת הדואר עוד לא הוגדר בשרת האתר, ולכן אי אפשר לשלוח מיילים.', 503)
    try:
        send_test(to)
    except Exception as e:
        log.error('Test e-mail failed: %s', type(e).__name__)
        return error('השליחה נכשלה. בדקו את הגדרות שרת הדואר.', 502)
    return JsonResponse({'sent': True})
