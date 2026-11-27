"""
Checkout and Cardcom payments. Cardcom itself is never called: content.cardcom._post
is replaced by a fake that records what would have been sent.
"""

import json
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from .models import Order, ProductStock, ShopSettings, SiteContent

PASSWORD = 'correct-horse-battery-staple'
LP_ID = '6c2f7a8e-1111-4222-8333-944455556666'
CARDCOM = dict(CARDCOM_TERMINAL='1000', CARDCOM_API_NAME='test-api-name', SITE_URL='https://shop.example')


class FakeCardcom:
    """Stands in for Cardcom's API: answers Create and GetLpResult, and records every call."""

    def __init__(self, paid=True, amount=None, page_url='https://secure.cardcom.solutions/External/LowProfile.aspx?x=1'):
        self.calls = []
        self.paid = paid
        self.amount = amount
        self.page_url = page_url

    def __call__(self, path, payload):
        self.calls.append((path, payload))
        if path.endswith('/Create'):
            self.created = payload
            return {'ResponseCode': 0, 'LowProfileId': LP_ID, 'Url': self.page_url}
        if path.endswith('/GetLpResult'):
            if not self.paid:
                return {'ResponseCode': 0, 'LowProfileId': LP_ID, 'TerminalNumber': 1000, 'TranzactionInfo': {'ResponseCode': 33, 'Description': 'declined'}}
            amount = self.amount if self.amount is not None else self.created['Amount']
            return {
                'ResponseCode': 0,
                'LowProfileId': LP_ID,
                'TerminalNumber': 1000,
                'TranzactionId': 987654,
                'TranzactionInfo': {
                    'ResponseCode': 0,
                    'TranzactionId': 987654,
                    'Amount': amount,
                    'CoinId': 1,
                    'Last4CardDigitsString': '4242',
                    'ApprovalNumber': '0012345',
                    'NumberOfPayments': 3,
                },
            }
        raise AssertionError(path)


def cart(**overrides):
    body = {
        'items': [{'id': 'package:basic', 'qty': 2}],
        'customer': {'name': 'ישראלה ישראלי', 'phone': '050-1234567', 'email': 'buyer@example.com'},
        'delivery': {'method': 'pickup'},
        'notes': '',
        'acceptedTerms': True,
    }
    body.update(overrides)
    return body


@override_settings(**CARDCOM)
class CheckoutTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)
        content = SiteContent.load()
        content.published['checkout'] = {'deliveryEnabled': True, 'deliveryFee': '30', 'pickupEnabled': True, 'maxPayments': 3}
        content.published['catalog']['products'] = [
            {'id': 'p-1', 'categoryId': 'balloons', 'name': 'בלון זהב', 'description': '', 'price': '12.50', 'oldPrice': '', 'image': ''},
            {'id': 'p-2', 'categoryId': 'balloons', 'name': 'אזל', 'description': '', 'price': '9', 'oldPrice': '', 'image': ''},
            {'id': 'p-3', 'categoryId': 'balloons', 'name': 'שלושה אחרונים', 'description': '', 'price': '5', 'oldPrice': '', 'image': ''},
        ]
        content.save()
        ProductStock.objects.create(product_id='p-2', quantity=0)
        ProductStock.objects.create(product_id='p-3', quantity=3)

    def order(self, body=None, fake=None):
        fake = fake or FakeCardcom()
        with mock.patch('content.cardcom._post', fake):
            res = self.client.post('/api/orders/', json.dumps(body or cart()), content_type='application/json')
        return res, fake

    # pricing ---------------------------------------------------------------

    def test_server_prices_the_order_and_ignores_prices_from_the_browser(self):
        res, fake = self.order(cart(items=[{'id': 'package:basic', 'qty': 2, 'price': 1}, {'id': 'product:p-1', 'qty': 1, 'price': 0.01}]))
        self.assertEqual(res.status_code, 201, res.content)
        order = Order.objects.get()
        self.assertEqual(order.total, Decimal('310.50'))  # 2 × 149 + 12.50, pickup
        self.assertEqual(fake.created['Amount'], 310.5)
        self.assertEqual(order.status, Order.PENDING)

    def test_delivery_fee_is_added(self):
        res, _ = self.order(cart(delivery={'method': 'delivery', 'address': 'הרצל 1', 'city': 'תל אביב'}))
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(Order.objects.get().total, Decimal('328.00'))

    def test_unknown_unavailable_and_bad_quantities_are_refused(self):
        for items in (
            [{'id': 'package:nope', 'qty': 1}],
            [{'id': 'product:p-2', 'qty': 1}],  # out of stock
            [{'id': 'package:basic', 'qty': 0}],
            [{'id': 'package:basic', 'qty': 21}],
            [{'id': 'package:basic', 'qty': 1.5}],
            [],
        ):
            res, fake = self.order(cart(items=items))
            self.assertEqual(res.status_code, 400, items)
            self.assertEqual(fake.calls, [])
        self.assertFalse(Order.objects.exists())

    def test_terms_and_details_are_required(self):
        self.assertEqual(self.order(cart(acceptedTerms=False))[0].status_code, 400)
        self.assertEqual(self.order(cart(customer={'name': 'x', 'phone': '123', 'email': 'a@b.co'}))[0].status_code, 400)
        self.assertEqual(self.order(cart(customer={'name': 'x', 'phone': '0501234567', 'email': 'nope'}))[0].status_code, 400)
        self.assertEqual(self.order(cart(delivery={'method': 'delivery', 'address': '', 'city': ''}))[0].status_code, 400)

    # leaks and redirects -----------------------------------------------------

    def test_no_cookies_and_no_card_data_and_secret_stays_server_side(self):
        res, fake = self.order()
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.cookies, {})
        body = res.json()
        self.assertEqual(set(body), {'paymentUrl', 'token'})
        self.assertNotIn('test-api-name', res.content.decode())
        # Cardcom gets the order's return addresses on our configured site, never one from the request.
        self.assertTrue(fake.created['SuccessRedirectUrl'].startswith('https://shop.example/order/'))
        self.assertEqual(fake.created['WebHookUrl'], 'https://shop.example/api/payments/cardcom/webhook/')

    def test_forged_host_header_does_not_change_return_address(self):
        fake = FakeCardcom()
        with mock.patch('content.cardcom._post', fake):
            self.client.post('/api/orders/', json.dumps(cart()), content_type='application/json', HTTP_HOST='localhost')
        self.assertTrue(fake.created['SuccessRedirectUrl'].startswith('https://shop.example/'))

    def test_payment_page_outside_cardcom_is_refused(self):
        res, _ = self.order(fake=FakeCardcom(page_url='https://evil.example/pay'))
        self.assertEqual(res.status_code, 502)
        self.assertEqual(Order.objects.get().status, Order.FAILED)
        res, _ = self.order(fake=FakeCardcom(page_url='http://secure.cardcom.solutions/pay'))  # not https
        self.assertEqual(res.status_code, 502)

    def test_form_posts_from_other_sites_are_refused(self):
        res = self.client.post('/api/orders/', {'items': 'x'})
        self.assertEqual(res.status_code, 415)

    @override_settings(CARDCOM_API_NAME='')
    def test_without_cardcom_checkout_says_order_by_phone(self):
        self.assertFalse(self.client.get('/api/checkout/').json()['enabled'])
        res, fake = self.order()
        self.assertEqual(res.status_code, 503)
        self.assertEqual(fake.calls, [])

    @override_settings(SITE_URL='', DEV_MODE=False)
    def test_production_without_site_url_takes_no_payments(self):
        self.assertEqual(self.order()[0].status_code, 503)

    @override_settings(ORDER_RATE_LIMIT=2)
    def test_checkout_attempts_are_rate_limited(self):
        self.assertEqual(self.order()[0].status_code, 201)
        self.assertEqual(self.order()[0].status_code, 201)
        self.assertEqual(self.order()[0].status_code, 429)

    # payment results -----------------------------------------------------------

    def test_status_page_confirms_payment_with_cardcom_and_shows_no_personal_data(self):
        res, fake = self.order()
        token = res.json()['token']
        with mock.patch('content.cardcom._post', fake):
            status = self.client.get(f'/api/orders/{token}/')
        self.assertEqual(status.json()['status'], 'paid')
        text = status.content.decode()
        for private in ('ישראלה', '050-1234567', 'buyer@example.com', '4242'):
            self.assertNotIn(private, text)
        order = Order.objects.get()
        self.assertEqual((order.card_last4, order.num_payments, order.transaction_id), ('4242', 3, '987654'))

    def test_amount_mismatch_is_not_marked_paid(self):
        res, fake = self.order()
        fake.amount = 1
        cache.clear()
        with mock.patch('content.cardcom._post', fake):
            self.client.get(f"/api/orders/{res.json()['token']}/")
        self.assertEqual(Order.objects.get().status, Order.FAILED)

    def test_declined_card_is_not_paid(self):
        res, fake = self.order(fake=FakeCardcom(paid=False))
        with mock.patch('content.cardcom._post', fake):
            body = self.client.get(f"/api/orders/{res.json()['token']}/").json()
        self.assertEqual(body['status'], 'failed')

    def test_webhook_body_is_not_trusted(self):
        res, fake = self.order(fake=FakeCardcom(paid=False))
        forged = {'ResponseCode': 0, 'LowProfileId': LP_ID, 'TranzactionInfo': {'ResponseCode': 0, 'Amount': 298}}
        with mock.patch('content.cardcom._post', fake):
            hook = self.client.post('/api/payments/cardcom/webhook/', json.dumps(forged), content_type='application/json')
        self.assertEqual(hook.status_code, 200)
        self.assertEqual(Order.objects.get().status, Order.FAILED)  # Cardcom's own answer said declined
        self.assertEqual(fake.calls[-1][0], '/api/v11/LowProfile/GetLpResult')

    @override_settings(SITE_URL='http://shop.example', DEV_MODE=False)
    def test_live_site_needs_https_return_address(self):
        self.assertEqual(self.order()[0].status_code, 503)

    def test_webhook_marks_paid_after_checking(self):
        res, fake = self.order()
        with mock.patch('content.cardcom._post', fake):
            self.client.post('/api/payments/cardcom/webhook/', json.dumps({'LowProfileId': LP_ID}), content_type='application/json')
        self.assertEqual(Order.objects.get().status, Order.PAID)

    def test_order_tokens_cannot_be_guessed_or_enumerated(self):
        self.order()
        self.assertEqual(self.client.get('/api/orders/1/').status_code, 404)
        self.assertEqual(self.client.get('/api/orders/' + 'A' * 32 + '/').status_code, 404)
        self.assertGreaterEqual(len(Order.objects.get().token), 32)

    def test_unpaid_orders_are_deleted_after_retention(self):
        self.order()
        Order.objects.update(created_at=timezone.now() - timedelta(days=31))
        self.order()
        self.assertEqual(Order.objects.count(), 1)

    # stock -----------------------------------------------------------------------

    def test_cannot_order_more_than_is_left(self):
        res, fake = self.order(cart(items=[{'id': 'product:p-3', 'qty': 4}]))
        self.assertEqual(res.status_code, 400)
        self.assertIn('3', res.json()['error'])
        self.assertEqual(fake.calls, [])
        self.assertEqual(self.order(cart(items=[{'id': 'product:p-3', 'qty': 3}]))[0].status_code, 201)

    def test_paid_order_lowers_stock_and_sells_out(self):
        res, fake = self.order(cart(items=[{'id': 'product:p-3', 'qty': 3}, {'id': 'product:p-1', 'qty': 2}]))
        with mock.patch('content.cardcom._post', fake):
            self.client.get(f"/api/orders/{res.json()['token']}/")
            cache.clear()
            self.client.get(f"/api/orders/{res.json()['token']}/")  # checking again doesn't take stock twice
        self.assertEqual(ProductStock.objects.get(pk='p-3').quantity, 0)
        self.assertFalse(ProductStock.objects.filter(pk='p-1').exists())  # untracked stays untracked
        products = {p['id']: p for p in self.client.get('/api/content/').json()['catalog']['products']}
        self.assertEqual((products['p-3']['stock'], products['p-1']['stock']), ('0', ''))

    def test_unpaid_order_takes_nothing_from_stock(self):
        self.order(cart(items=[{'id': 'product:p-3', 'qty': 2}], ), fake=FakeCardcom(paid=False))
        self.assertEqual(ProductStock.objects.get(pk='p-3').quantity, 3)

    def test_visitors_see_stock_capped_not_the_real_level(self):
        ProductStock.objects.create(product_id='p-1', quantity=480)
        products = {p['id']: p for p in self.client.get('/api/content/').json()['catalog']['products']}
        self.assertEqual(products['p-1']['stock'], '20')
        self.assertNotIn('480', self.client.get('/category/balloons').content.decode())

    def test_stock_is_set_by_staff_only_and_never_saved_in_the_draft(self):
        self.assertEqual(self.client.post('/api/admin/stock/p-1/', '{"quantity": 5}', content_type='application/json').status_code, 403)
        User = get_user_model()
        User.objects.create_user('owner', password=PASSWORD, is_staff=True)
        staff = Client()
        staff.login(username='owner', password=PASSWORD)
        self.assertEqual(staff.post('/api/admin/stock/p-1/', '{"quantity": 5}', content_type='application/json').status_code, 200)
        self.assertEqual(staff.get('/api/admin/stock/').json()['stock']['p-1'], 5)
        for bad in ('-1', '1.5', '"5"', '100000'):
            self.assertEqual(staff.post('/api/admin/stock/p-1/', f'{{"quantity": {bad}}}', content_type='application/json').status_code, 400, bad)
        self.assertEqual(staff.post('/api/admin/stock/p-1/', '{"quantity": null}', content_type='application/json').status_code, 200)
        self.assertFalse(ProductStock.objects.filter(pk='p-1').exists())

        draft = json.loads(json.dumps(SiteContent.load().draft))
        draft['catalog']['products'] = [{'id': 'p-9', 'categoryId': 'balloons', 'name': 'x', 'description': '', 'price': '1', 'oldPrice': '', 'image': '', 'stock': '999'}]
        staff.put('/api/admin/content/', json.dumps({'draft': draft}), content_type='application/json')
        self.assertNotIn('stock', SiteContent.load().draft['catalog']['products'][0])

    # owner's notices and workflow ---------------------------------------------

    def staff(self):
        User = get_user_model()
        User.objects.create_user('owner', password=PASSWORD, is_staff=True)
        staff = Client()
        staff.login(username='owner', password=PASSWORD)
        return staff

    def paid_order(self):
        res, fake = self.order(cart(notes='לצלצל בדלת'))
        with mock.patch('content.cardcom._post', fake):
            self.client.get(f"/api/orders/{res.json()['token']}/")
        return res.json()['token'], fake

    def test_owner_is_emailed_once_per_paid_order_without_customer_details(self):
        ShopSettings.objects.update_or_create(pk=1, defaults={'notify_email': 'owner@shop.example'})
        with self.captureOnCommitCallbacks(execute=True):
            token, fake = self.paid_order()
        with self.captureOnCommitCallbacks(execute=True), mock.patch('content.cardcom._post', fake):
            cache.clear()
            self.client.get(f'/api/orders/{token}/')
            self.client.post('/api/payments/cardcom/webhook/', json.dumps({'LowProfileId': LP_ID}), content_type='application/json')
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ['owner@shop.example'])
        number = Order.objects.get().number
        self.assertIn(str(number), message.subject)
        self.assertIn('https://shop.example/admin/orders', message.body)
        for private in ('ישראלה', '050-1234567', 'buyer@example.com', 'לצלצל', '4242'):
            self.assertNotIn(private, message.subject + message.body)

    def test_no_email_without_an_address_or_for_unpaid_orders(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.paid_order()
        ShopSettings.objects.update_or_create(pk=1, defaults={'notify_email': 'owner@shop.example'})
        with self.captureOnCommitCallbacks(execute=True):
            self.order(fake=FakeCardcom(paid=False))
        self.assertEqual(len(mail.outbox), 0)

    def test_mail_failure_does_not_affect_the_order(self):
        ShopSettings.objects.update_or_create(pk=1, defaults={'notify_email': 'owner@shop.example'})
        with self.captureOnCommitCallbacks(execute=True), mock.patch('content.notifications.send_mail', side_effect=OSError):
            self.paid_order()
        self.assertEqual(Order.objects.get().status, Order.PAID)

    def test_preparing_step_notes_and_summary(self):
        self.paid_order()
        staff = self.staff()
        order = Order.objects.get()
        self.assertEqual(staff.get('/api/admin/orders/summary/').json(), {'new': 1, 'preparing': 0})
        res = staff.post(f'/api/admin/orders/{order.pk}/', json.dumps({'status': 'preparing', 'staffNote': 'איסוף ביום ה'}), content_type='application/json')
        self.assertEqual(res.json()['status'], 'preparing')
        self.assertEqual(res.json()['staffNote'], 'איסוף ביום ה')
        self.assertEqual(staff.get('/api/admin/orders/summary/').json(), {'new': 0, 'preparing': 1})
        # The customer sees "paid", and never the owner's note.
        status = self.client.get(f'/api/orders/{order.token}/')
        self.assertEqual(status.json()['status'], 'paid')
        self.assertNotIn('איסוף ביום ה', status.content.decode())
        self.assertEqual(staff.post(f'/api/admin/orders/{order.pk}/', '{"status": "cancelled"}', content_type='application/json').status_code, 400)
        self.assertEqual(staff.post(f'/api/admin/orders/{order.pk}/', json.dumps({'staffNote': 'x' * 1001}), content_type='application/json').status_code, 400)

    def test_notification_address_is_private_and_validated(self):
        self.assertEqual(self.client.get('/api/admin/settings/').status_code, 401)
        staff = self.staff()
        self.assertEqual(staff.put('/api/admin/settings/', '{"notifyEmail": "not-an-email"}', content_type='application/json').status_code, 400)
        res = staff.put('/api/admin/settings/', '{"notifyEmail": "private@shop.example"}', content_type='application/json')
        self.assertEqual(res.json()['notifyEmail'], 'private@shop.example')
        self.assertNotIn('private@shop.example', self.client.get('/api/content/').content.decode())
        self.assertNotIn('private@shop.example', self.client.get('/').content.decode())
        self.assertEqual(staff.post('/api/admin/settings/test-email/').status_code, 200)
        self.assertEqual(mail.outbox[-1].to, ['private@shop.example'])

    # owner ---------------------------------------------------------------------

    def test_order_details_are_for_staff_only(self):
        _, fake = self.order()
        self.assertEqual(self.client.get('/api/admin/orders/').status_code, 401)
        User = get_user_model()
        User.objects.create_user('owner', password=PASSWORD, is_staff=True)
        staff = Client()
        staff.login(username='owner', password=PASSWORD)
        with mock.patch('content.cardcom._post', fake):
            orders = staff.get('/api/admin/orders/').json()['orders']
        self.assertEqual(orders[0]['customer']['email'], 'buyer@example.com')

    def test_category_pages_and_unknown_categories(self):
        self.assertEqual(self.client.get('/category/balloons').status_code, 200)
        self.assertEqual(self.client.get('/category/no-such-thing').status_code, 404)
        res = self.client.get('/checkout')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['X-Robots-Tag'], 'noindex, nofollow')


class CatalogValidationTests(TestCase):
    def setUp(self):
        User = get_user_model()
        User.objects.create_user('owner', password=PASSWORD, is_staff=True)
        self.client = Client()
        self.client.login(username='owner', password=PASSWORD)

    def put(self, mutate):
        draft = json.loads(json.dumps(SiteContent.load().draft))
        mutate(draft)
        return self.client.put('/api/admin/content/', json.dumps({'draft': draft}), content_type='application/json')

    def test_bad_prices_ids_and_installments_are_refused(self):
        def bad_price(d):
            d['packages']['tiers'][0]['price'] = '1e9'

        def dup_category(d):
            d['catalog']['categories'][1]['id'] = d['catalog']['categories'][0]['id']

        def bad_category_id(d):
            d['catalog']['categories'][0]['id'] = '../admin'

        def too_many_payments(d):
            d['checkout']['maxPayments'] = 40

        for mutate in (bad_price, dup_category, bad_category_id, too_many_payments):
            self.assertEqual(self.put(mutate).status_code, 400, mutate.__name__)

    def test_work_in_progress_product_without_price_saves(self):
        def add(d):
            d['catalog']['products'].append({'id': 'p-x', 'categoryId': 'balloons', 'name': '', 'description': '', 'price': '', 'oldPrice': '', 'image': '', 'available': True})

        self.assertEqual(self.put(add).status_code, 200)
