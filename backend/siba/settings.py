"""
Django settings for the סיבה למסיבה backend.

Development needs no configuration. Production is switched on by setting
DJANGO_SECRET_KEY, and is configured entirely through environment variables:

    DJANGO_SECRET_KEY        long random string (required in production)
    DJANGO_ALLOWED_HOSTS     comma-separated, e.g. "siba-lmesiba.co.il,www.siba-lmesiba.co.il"
    DJANGO_CSRF_TRUSTED_ORIGINS  comma-separated, e.g. "https://siba-lmesiba.co.il"
    DJANGO_DEBUG             "1" to force debug mode (never in production)
    SITE_URL                 the site's public address, e.g. "https://siba-lmesiba.co.il"
                             (required for online payments in production)
    CARDCOM_TERMINAL         Cardcom terminal number    } both empty = no online payment:
    CARDCOM_API_NAME         Cardcom API name (secret)  } checkout offers ordering by phone
    CARDCOM_CREATE_DOCUMENT  "1" = Cardcom issues and e-mails a receipt for each payment
                             (needs the documents module on the terminal)
    EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_FROM
                             the mail server new-order notices are sent through
"""

import os
from pathlib import Path

from django.utils.csp import CSP

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BASE_DIR.parent


def env_list(name, default=''):
    return [v.strip() for v in os.environ.get(name, default).split(',') if v.strip()]


SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
# Without a real secret key this is a developer machine: debug on, local hosts only.
# A production server can't accidentally run on the development key.
DEV_MODE = not SECRET_KEY
if DEV_MODE:
    SECRET_KEY = 'django-insecure-development-only-key-not-for-production'
DEBUG = os.environ.get('DJANGO_DEBUG', '1' if DEV_MODE else '0') == '1'

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', '127.0.0.1,localhost')
CSRF_TRUSTED_ORIGINS = env_list(
    'DJANGO_CSRF_TRUSTED_ORIGINS',
    # Vite's dev server (port 3000) proxies /api to Django (port 8000).
    'http://127.0.0.1:3000,http://localhost:3000' if DEV_MODE else '',
)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'content',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.csp.ContentSecurityPolicyMiddleware',
]

ROOT_URLCONF = 'siba.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'siba.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'he'
TIME_ZONE = 'Asia/Jerusalem'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Images the owner uploads in the admin panel.
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# The built React site (npm run build). Django serves it in production, with the
# published content inlined into index.html so the first paint is already current.
FRONTEND_DIST = PROJECT_DIR / 'dist'
WHITENOISE_ROOT = FRONTEND_DIST if FRONTEND_DIST.is_dir() else None

# First-run content: the site's original texts, prices and business details.
DEFAULT_CONTENT_PATH = PROJECT_DIR / 'src' / 'content' / 'site-content.json'

# Largest content document and uploaded image the API accepts.
CONTENT_MAX_BYTES = 1_000_000
IMAGE_MAX_BYTES = 10 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 2_500_000
FILE_UPLOAD_MAX_MEMORY_SIZE = IMAGE_MAX_BYTES

# External sites content images may still come from. Each one learns the IP of every
# visitor who sees its image, so the goal is an empty list: once the owner has uploaded
# their own photos, remove the host and the site makes no third-party requests at all.
CONTENT_IMAGE_HOSTS = ['lh3.googleusercontent.com']

# Content Security Policy: the browser refuses to load anything from, or send anything
# to, a site not listed here. Even an injected script couldn't leak data elsewhere.
SECURE_CSP = {
    'default-src': [CSP.SELF],
    'script-src': [CSP.SELF],
    'style-src': [CSP.SELF, CSP.UNSAFE_INLINE],
    'img-src': [CSP.SELF, 'data:', *(f'https://{host}' for host in CONTENT_IMAGE_HOSTS)],
    'font-src': [CSP.SELF, 'data:'],
    'connect-src': [CSP.SELF],
    'frame-src': [CSP.SELF],
    'frame-ancestors': [CSP.SELF],
    'form-action': [CSP.SELF],
    'base-uri': [CSP.SELF],
    'object-src': [CSP.NONE],
}
# Links to other sites don't tell them which page the visitor came from.
SECURE_REFERRER_POLICY = 'same-origin'

# Sign-in throttling (content/throttle.py) covers both the site's login and Django's admin login.
AUTHENTICATION_BACKENDS = ['content.throttle.ThrottledModelBackend']

# Login throttling: this many failures within the window locks the IP / username.
LOGIN_MAX_FAILURES = 5
LOGIN_LOCKOUT_SECONDS = 15 * 60

# Sessions: an admin stays signed in for two weeks of inactivity at most.
SESSION_COOKIE_AGE = 14 * 24 * 60 * 60
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
# The admin panel previews the site in a same-origin frame.
X_FRAME_OPTIONS = 'SAMEORIGIN'

if not DEV_MODE:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = os.environ.get('DJANGO_SSL_REDIRECT', '1') == '1'
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
    SECURE_CONTENT_TYPE_NOSNIFF = True

# ------------------------------------------------------------------ orders and payments
# Card details are typed only on Cardcom's own payment page: they never reach this server.
# The API name is a secret: set it in the server's environment, never in the code or the content.
SITE_URL = os.environ.get('SITE_URL', '').rstrip('/')
CARDCOM_TERMINAL = os.environ.get('CARDCOM_TERMINAL', '').strip()
CARDCOM_API_NAME = os.environ.get('CARDCOM_API_NAME', '').strip()
CARDCOM_BASE_URL = os.environ.get('CARDCOM_BASE_URL', 'https://secure.cardcom.solutions').rstrip('/')
CARDCOM_CREATE_DOCUMENT = os.environ.get('CARDCOM_CREATE_DOCUMENT', '0') == '1'
CARDCOM_TIMEOUT_SECONDS = 20

# Each visitor IP may start this many checkouts per window (stops bots filling the orders table).
ORDER_RATE_LIMIT = 10
ORDER_RATE_WINDOW_SECONDS = 10 * 60
# Orders that were never paid hold personal details for no reason: deleted after this many days.
UNPAID_ORDER_RETENTION_DAYS = 30
MAX_ORDER_LINES = 50

# ------------------------------------------------------------------ e-mail
# New-order notices to the owner (content/notifications.py). Without a mail server,
# development prints the messages to the console and production sends none.
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = EMAIL_PORT == 587
EMAIL_USE_SSL = EMAIL_PORT == 465
EMAIL_TIMEOUT = 10
DEFAULT_FROM_EMAIL = os.environ.get('EMAIL_FROM', EMAIL_HOST_USER or 'shop@localhost')
if not EMAIL_HOST:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend' if DEV_MODE else 'django.core.mail.backends.dummy.EmailBackend'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# In development, serve static files straight from the apps (no collectstatic needed).
WHITENOISE_USE_FINDERS = DEBUG
WHITENOISE_AUTOREFRESH = DEBUG
