from django.contrib import admin
from django.utils.html import format_html

from .models import Order, ProductStock, ShopSettings, SiteContent, UploadedImage


@admin.register(SiteContent)
class SiteContentAdmin(admin.ModelAdmin):
    """Read-only: the content is edited in the site's own admin panel (#/admin)."""

    list_display = ('__str__', 'updated_at', 'updated_by', 'published_at', 'published_by')
    readonly_fields = ('updated_at', 'updated_by', 'published_at', 'published_by', 'draft', 'published')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(UploadedImage)
class UploadedImageAdmin(admin.ModelAdmin):
    list_display = ('thumbnail', 'original_name', 'uploaded_at', 'uploaded_by')
    readonly_fields = ('thumbnail', 'file', 'original_name', 'uploaded_at', 'uploaded_by')

    @admin.display(description='תצוגה')
    def thumbnail(self, obj):
        return format_html('<img src="{}" alt="" style="height:48px;border-radius:6px">', obj.file.url) if obj.file else ''

    def has_add_permission(self, request):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Read-only record of orders; the owner works with them in the site's admin panel (/admin/orders)."""

    list_display = ('__str__', 'status', 'total', 'delivery_method', 'customer_name', 'created_at')
    list_filter = ('status', 'delivery_method')
    search_fields = ('customer_name', 'customer_phone', 'customer_email')

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ProductStock)
class ProductStockAdmin(admin.ModelAdmin):
    list_display = ('product_id', 'quantity', 'updated_at')


@admin.register(ShopSettings)
class ShopSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
