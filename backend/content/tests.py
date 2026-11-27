import io
import json
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from PIL import Image

from .models import SiteContent

PASSWORD = 'correct-horse-battery-staple'
TEMP_MEDIA = tempfile.mkdtemp()


def png_bytes(size=(40, 30), mode='RGBA'):
    out = io.BytesIO()
    Image.new(mode, size, (216, 27, 106, 255) if mode == 'RGBA' else (216, 27, 106)).save(out, 'PNG')
    out.seek(0)
    out.name = 'test.png'
    return out


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class ApiTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        User = get_user_model()
        self.staff = User.objects.create_user('owner', password=PASSWORD, is_staff=True)
        self.customer = User.objects.create_user('customer', password=PASSWORD)
        self.client = Client(enforce_csrf_checks=True)

    # helpers ---------------------------------------------------------------

    def csrf(self):
        self.client.get('/api/auth/session/')
        return self.client.cookies['csrftoken'].value

    def post(self, url, data=None, **extra):
        return self.client.post(url, json.dumps(data or {}), content_type='application/json', HTTP_X_CSRFTOKEN=self.csrf(), **extra)

    def put(self, url, data):
        return self.client.put(url, json.dumps(data), content_type='application/json', HTTP_X_CSRFTOKEN=self.csrf())

    def sign_in(self, username='owner'):
        res = self.post('/api/auth/login/', {'username': username, 'password': PASSWORD})
        self.assertEqual(res.status_code, 200, res.content)

    # public ----------------------------------------------------------------

    def test_public_content_is_seeded_from_site_content_json(self):
        res = self.client.get('/api/content/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['version'], 1)
        self.assertIn('business', res.json())

    # auth ------------------------------------------------------------------

    def test_session_starts_signed_out_and_sets_csrf_cookie(self):
        res = self.client.get('/api/auth/session/')
        self.assertEqual(res.json(), {'authenticated': False, 'username': None})
        self.assertIn('csrftoken', res.cookies)

    def test_login_requires_csrf_token(self):
        res = self.client.post('/api/auth/login/', json.dumps({'username': 'owner', 'password': PASSWORD}), content_type='application/json')
        self.assertEqual(res.status_code, 403)

    def test_login_and_logout(self):
        self.sign_in()
        self.assertEqual(self.client.get('/api/auth/session/').json(), {'authenticated': True, 'username': 'owner'})
        self.post('/api/auth/logout/')
        self.assertFalse(self.client.get('/api/auth/session/').json()['authenticated'])

    def test_wrong_password_and_non_staff_get_the_same_answer(self):
        wrong = self.post('/api/auth/login/', {'username': 'owner', 'password': 'nope'})
        not_staff = self.post('/api/auth/login/', {'username': 'customer', 'password': PASSWORD})
        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(not_staff.status_code, 400)
        self.assertEqual(wrong.json(), not_staff.json())

    def test_repeated_failures_lock_the_login(self):
        for _ in range(5):
            self.post('/api/auth/login/', {'username': 'owner', 'password': 'nope'})
        res = self.post('/api/auth/login/', {'username': 'owner', 'password': PASSWORD})
        self.assertEqual(res.status_code, 429)

    # admin -----------------------------------------------------------------

    def test_admin_endpoints_need_a_signed_in_staff_user(self):
        self.assertEqual(self.client.get('/api/admin/content/').status_code, 401)
        self.client.force_login(self.customer)
        self.assertEqual(self.client.get('/api/admin/content/').status_code, 403)

    def test_draft_publish_and_discard(self):
        self.sign_in()
        draft = self.client.get('/api/admin/content/').json()['draft']
        draft['hero']['title'] = 'כותרת חדשה'

        saved = self.put('/api/admin/content/', {'draft': draft}).json()
        self.assertTrue(saved['hasUnpublishedChanges'])
        self.assertNotEqual(self.client.get('/api/content/').json()['hero']['title'], 'כותרת חדשה')

        published = self.post('/api/admin/publish/').json()
        self.assertFalse(published['hasUnpublishedChanges'])
        self.assertEqual(published['publishedBy'], 'owner')
        self.assertEqual(self.client.get('/api/content/').json()['hero']['title'], 'כותרת חדשה')

        draft['hero']['title'] = 'עוד שינוי'
        self.put('/api/admin/content/', {'draft': draft})
        discarded = self.post('/api/admin/discard/').json()
        self.assertEqual(discarded['draft']['hero']['title'], 'כותרת חדשה')

    def test_unsafe_links_and_inline_images_are_rejected(self):
        self.sign_in()
        draft = SiteContent.load().draft
        draft['hero']['primary']['href'] = 'javascript:alert(1)'
        self.assertEqual(self.put('/api/admin/content/', {'draft': draft}).status_code, 400)

        draft = SiteContent.load().draft
        draft['categories']['items'][0]['image'] = 'data:image/png;base64,AAAA'
        self.assertEqual(self.put('/api/admin/content/', {'draft': draft}).status_code, 400)

    def test_not_site_content_is_rejected(self):
        self.sign_in()
        self.assertEqual(self.put('/api/admin/content/', {'draft': {'hello': 'world'}}).status_code, 400)

    def test_image_upload_is_reencoded_to_webp(self):
        self.sign_in()
        res = self.client.post('/api/admin/images/', {'file': png_bytes()}, HTTP_X_CSRFTOKEN=self.csrf())
        self.assertEqual(res.status_code, 201, res.content)
        url = res.json()['url']
        self.assertTrue(url.startswith('/media/uploads/') and url.endswith('.webp'))

    def test_non_image_upload_is_rejected(self):
        self.sign_in()
        fake = io.BytesIO(b'<script>alert(1)</script>')
        fake.name = 'evil.png'
        res = self.client.post('/api/admin/images/', {'file': fake}, HTTP_X_CSRFTOKEN=self.csrf())
        self.assertEqual(res.status_code, 400)


TEMP_DIST = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TEMP_MEDIA, FRONTEND_DIST=__import__('pathlib').Path(TEMP_DIST))
class PrivacyAndRoutingTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        (__import__('pathlib').Path(TEMP_DIST) / 'index.html').write_text('<html><head></head><body></body></html>', encoding='utf-8')

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_DIST, ignore_errors=True)

    def setUp(self):
        cache.clear()
        get_user_model().objects.create_user('owner', password=PASSWORD, is_staff=True)

    def test_clean_page_addresses_serve_the_site_with_content_inlined(self):
        for url in ['/', '/terms', '/cancel/', '/admin', '/admin/hero']:
            res = self.client.get(url)
            self.assertEqual(res.status_code, 200, url)
            self.assertIn(b'id="site-content"', res.content, url)

    def test_unknown_address_is_a_real_404(self):
        self.assertEqual(self.client.get('/no-such-page').status_code, 404)
        self.assertEqual(self.client.get('/terms/extra').status_code, 404)

    def test_admin_pages_are_kept_out_of_search_engines(self):
        self.assertIn('noindex', self.client.get('/admin').headers.get('X-Robots-Tag', ''))
        self.assertNotIn('X-Robots-Tag', self.client.get('/').headers)

    def test_visitors_get_no_cookies(self):
        for url in ['/', '/terms', '/api/content/']:
            self.assertEqual(len(self.client.get(url).cookies), 0, url)

    def test_security_headers(self):
        res = self.client.get('/')
        csp = res.headers.get('Content-Security-Policy', '')
        self.assertIn("default-src 'self'", csp)
        self.assertIn("connect-src 'self'", csp)
        self.assertIn("frame-ancestors 'self'", csp)
        self.assertEqual(res.headers.get('Referrer-Policy'), 'same-origin')

    def test_django_admin_login_is_throttled_too(self):
        for _ in range(5):
            self.client.post('/django-admin/login/', {'username': 'owner', 'password': 'nope'})
        res = self.client.post('/django-admin/login/?next=/django-admin/', {'username': 'owner', 'password': PASSWORD})
        self.assertEqual(res.status_code, 200)  # form shown again, not a redirect into the admin
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_images_from_other_sites_are_rejected(self):
        self.client.force_login(get_user_model().objects.get(username='owner'))
        csrf_client = self.client
        draft = SiteContent.load().draft
        draft['categories']['items'][0]['image'] = 'https://tracker.example.com/pixel.png'
        res = csrf_client.put('/api/admin/content/', json.dumps({'draft': draft}), content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_uploaded_photo_loses_its_location_data(self):
        self.client.force_login(get_user_model().objects.get(username='owner'))
        exif = Image.Exif()
        exif[0x010F] = 'PhoneMaker'  # camera make
        exif[0x8825] = {1: 'N', 2: (32.0, 4.0, 0.0)}  # GPS info
        src = io.BytesIO()
        Image.new('RGB', (50, 40), (255, 212, 71)).save(src, 'JPEG', exif=exif)
        src.seek(0)
        src.name = 'phone.jpg'
        url = self.client.post('/api/admin/images/', {'file': src}).json()['url']
        from django.conf import settings

        stored = Image.open(__import__('pathlib').Path(settings.MEDIA_ROOT) / url.removeprefix('/media/'))
        self.assertEqual(stored.format, 'WEBP')
        self.assertEqual(len(stored.getexif()), 0)


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class InstagramTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client.force_login(get_user_model().objects.create_user('owner', password=PASSWORD, is_staff=True))

    def save(self, handle):
        draft = SiteContent.load().draft
        draft['business']['instagram'] = handle
        return self.client.put('/api/admin/content/', json.dumps({'draft': draft}), content_type='application/json')

    def test_valid_handle_or_empty_is_saved(self):
        self.assertEqual(self.save('siba.lmesiba').status_code, 200)
        self.assertEqual(self.save('').status_code, 200)

    def test_links_and_odd_characters_are_rejected(self):
        for bad in ['https://evil.example/x', 'javascript:alert(1)', 'a b', 'x' * 31]:
            self.assertEqual(self.save(bad).status_code, 400, bad)
