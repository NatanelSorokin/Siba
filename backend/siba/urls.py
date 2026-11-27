from django.conf import settings
from django.contrib import admin
from django.urls import path, re_path
from django.views.static import serve

from content import views

admin.site.site_header = 'סיבה למסיבה: משתמשים והרשאות'
admin.site.site_title = 'סיבה למסיבה'
admin.site.index_title = 'ניהול משתמשים'

urlpatterns = [
    # The React site's pages and its admin panel: /, /terms, /category/balloons, /admin/hero…
    re_path(
        r'^(?:accessibility|cancel|terms|privacy|shipping|checkout|category/[a-z0-9-]+|order/[A-Za-z0-9_-]+|admin(?:/[a-z]+)?)?/?$',
        views.index,
        name='index',
    ),
    # API
    path('api/content/', views.public_content),
    path('api/auth/session/', views.session),
    path('api/auth/login/', views.login_view),
    path('api/auth/logout/', views.logout_view),
    path('api/admin/content/', views.admin_content),
    path('api/admin/publish/', views.publish),
    path('api/admin/discard/', views.discard),
    path('api/admin/images/', views.upload_image),
    path('api/admin/orders/', views.admin_orders),
    path('api/admin/orders/summary/', views.admin_orders_summary),
    path('api/admin/orders/<int:order_id>/', views.admin_order),
    path('api/admin/payments/', views.admin_payments),
    path('api/admin/settings/', views.admin_shop_settings),
    path('api/admin/settings/test-email/', views.admin_test_email),
    path('api/admin/stock/', views.admin_stock),
    path('api/admin/stock/<str:product_id>/', views.admin_product_stock),
    # Checkout
    path('api/checkout/', views.checkout_options),
    path('api/orders/', views.create_order),
    path('api/orders/<str:token>/', views.order_detail),
    path('api/payments/cardcom/webhook/', views.cardcom_webhook),
    # Django's own admin, for users, passwords and permissions
    path('django-admin/', admin.site.urls),
    # Uploaded images. Fine for a small shop; behind a CDN or the web server for heavy traffic.
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    # Any other address: the site's "page not found" screen, with a real 404 status.
    re_path(r'^(?!(?:api|media|django-admin|static)(?:/|$))(?P<path>.*)$', views.not_found),
]
