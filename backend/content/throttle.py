"""
Sign-in throttling, shared by the site's login API and Django's own admin login.

After LOGIN_MAX_FAILURES failed attempts within LOGIN_LOCKOUT_SECONDS, both the
username and the client IP are locked out until the window passes.
"""

from django.conf import settings
from django.contrib.auth.backends import ModelBackend
from django.core.cache import cache
from django.core.exceptions import PermissionDenied


def client_ip(request):
    # REMOTE_ADDR is the direct peer. Behind a reverse proxy, configure the proxy to
    # set it (or adapt this) so the lockout counts real visitors, not the proxy.
    return request.META.get('REMOTE_ADDR', 'unknown') if request is not None else 'unknown'


def _keys(request, username):
    return [f'login-fail:ip:{client_ip(request)}', f'login-fail:user:{(username or "").strip().lower()}']


def is_locked(request, username) -> bool:
    return any((cache.get(k) or 0) >= settings.LOGIN_MAX_FAILURES for k in _keys(request, username))


def record_failure(request, username):
    for k in _keys(request, username):
        if not cache.add(k, 1, settings.LOGIN_LOCKOUT_SECONDS):
            try:
                cache.incr(k)
            except ValueError:  # expired between add() and incr()
                cache.set(k, 1, settings.LOGIN_LOCKOUT_SECONDS)


def clear(request, username):
    cache.delete_many(_keys(request, username))


class ThrottledModelBackend(ModelBackend):
    """Django's normal username/password check, refusing locked-out usernames and IPs."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('username')
        if request is not None and username and is_locked(request, username):
            raise PermissionDenied  # stops authentication; the login form shows its generic error
        user = super().authenticate(request, username=username, password=password, **kwargs)
        if request is not None and username:
            if user is None:
                record_failure(request, username)
            else:
                clear(request, username)
        return user
