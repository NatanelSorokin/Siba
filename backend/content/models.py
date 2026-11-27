import json
import secrets

from django.conf import settings
from django.db import models


class SiteContent(models.Model):
    """
    The whole editable site, as one JSON document (shape: src/content/types.ts).

    A single row. `draft` is what the admin panel edits and autosaves;
    `published` is what visitors see. Publishing copies the draft over.
    """

    draft = models.JSONField('טיוטה')
    published = models.JSONField('גרסה מפורסמת')
    updated_at = models.DateTimeField('עודכן', auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name='עודכן על ידי', null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    published_at = models.DateTimeField('פורסם', null=True, blank=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name='פורסם על ידי', null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )

    class Meta:
        verbose_name = 'תוכן האתר'
        verbose_name_plural = 'תוכן האתר'

    def __str__(self):
        return 'תוכן האתר'

    def save(self, *args, **kwargs):
        self.pk = 1  # always the one row
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> 'SiteContent':
        """The site's content, created from the original site-content.json on first use."""
        obj = cls.objects.filter(pk=1).first()
        if obj is None:
            initial = json.loads(settings.DEFAULT_CONTENT_PATH.read_text(encoding='utf-8'))
            obj, _ = cls.objects.get_or_create(pk=1, defaults={'draft': initial, 'published': initial})
        return obj

    @property
    def has_unpublished_changes(self) -> bool:
        return self.draft != self.published


class UploadedImage(models.Model):
    """An image uploaded from the admin panel, re-encoded to WebP by the server."""

    file = models.ImageField('קובץ', upload_to='uploads/%Y/%m/')
    original_name = models.CharField('שם הקובץ המקורי', max_length=255, blank=True)
    uploaded_at = models.DateTimeField('הועלה', auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name='הועלה על ידי', null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )

    class Meta:
        verbose_name = 'תמונה'
        verbose_name_plural = 'תמונות'
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.original_name or self.file.name


def new_order_token() -> str:
    return secrets.token_urlsafe(24)


class Order(models.Model):
    """
    An order placed through the site's checkout.

    Prices are worked out on the server from the published content (never taken from
    the browser), and the order is only marked paid after the server itself asked
    Cardcom for the payment's result. No card details are ever stored here: Cardcom
    keeps them, this keeps only the last 4 digits for reference.
    """

    PENDING, PAID, PREPARING, FAILED, FULFILLED, CANCELLED = 'pending', 'paid', 'preparing', 'failed', 'fulfilled', 'cancelled'
    STATUS_CHOICES = [
        (PENDING, 'ממתינה לתשלום'),
        (PAID, 'שולמה, חדשה'),
        (PREPARING, 'בהכנה'),
        (FAILED, 'התשלום נכשל'),
        (FULFILLED, 'נשלחה / נאספה'),
        (CANCELLED, 'בוטלה'),
    ]
    DELIVERY, PICKUP = 'delivery', 'pickup'
    DELIVERY_CHOICES = [(DELIVERY, 'משלוח'), (PICKUP, 'איסוף עצמי')]

    # The customer's link to their order's status page. Long and random: not guessable.
    token = models.CharField(max_length=64, unique=True, default=new_order_token, editable=False)
    status = models.CharField('סטטוס', max_length=12, choices=STATUS_CHOICES, default=PENDING, db_index=True)

    items = models.JSONField('פריטים')  # [{id, name, unitPrice, qty, lineTotal}], prices as strings
    subtotal = models.DecimalField('סכום הפריטים', max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField('דמי משלוח', max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField('סה"כ לתשלום', max_digits=10, decimal_places=2)

    delivery_method = models.CharField('אופן קבלה', max_length=10, choices=DELIVERY_CHOICES)
    customer_name = models.CharField('שם', max_length=80)
    customer_phone = models.CharField('טלפון', max_length=20)
    customer_email = models.EmailField('דוא"ל', max_length=120)
    address = models.CharField('כתובת', max_length=120, blank=True)
    city = models.CharField('עיר', max_length=60, blank=True)
    notes = models.CharField('הערות', max_length=500, blank=True)

    created_at = models.DateTimeField('נוצרה', auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField('עודכנה', auto_now=True)
    paid_at = models.DateTimeField('שולמה ב', null=True, blank=True)

    # Cardcom's references for this payment
    lowprofile_id = models.CharField('מזהה עמוד תשלום', max_length=64, blank=True, db_index=True)
    transaction_id = models.CharField('מספר עסקה', max_length=32, blank=True)
    approval_number = models.CharField('מספר אישור', max_length=32, blank=True)
    card_last4 = models.CharField('4 ספרות אחרונות', max_length=4, blank=True)
    num_payments = models.PositiveSmallIntegerField('מספר תשלומים', null=True, blank=True)
    payment_error = models.CharField('שגיאת תשלום', max_length=250, blank=True)
    # The owner's own note ("called her, picking up Thursday"). Never shown to the customer.
    staff_note = models.CharField('הערה פנימית', max_length=1000, blank=True)

    class Meta:
        verbose_name = 'הזמנה'
        verbose_name_plural = 'הזמנות'
        ordering = ['-created_at']

    def __str__(self):
        return f'הזמנה {self.number}'

    @property
    def number(self) -> int:
        """The order number shown to the customer and the owner."""
        return 1000 + (self.pk or 0)


class ProductStock(models.Model):
    """
    How many of a catalog product are left. Kept apart from the content (which is
    drafted and published) so a sale and the owner's open editor never overwrite each
    other. No row = stock isn't tracked for that product.
    """

    product_id = models.CharField('מזהה מוצר', max_length=40, primary_key=True)
    quantity = models.PositiveIntegerField('כמות במלאי')
    updated_at = models.DateTimeField('עודכן', auto_now=True)

    class Meta:
        verbose_name = 'מלאי'
        verbose_name_plural = 'מלאי'

    def __str__(self):
        return f'{self.product_id}: {self.quantity}'

    @classmethod
    def as_map(cls) -> dict:
        return dict(cls.objects.values_list('product_id', 'quantity'))


class ShopSettings(models.Model):
    """
    Settings that must stay private, so they can't live in the site content (which every
    visitor downloads): where new-order notices are e-mailed. A single row.
    """

    notify_email = models.EmailField('דוא"ל להתראות על הזמנות', max_length=120, blank=True)

    class Meta:
        verbose_name = 'הגדרות חנות'
        verbose_name_plural = 'הגדרות חנות'

    def __str__(self):
        return 'הגדרות חנות'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> 'ShopSettings':
        return cls.objects.get_or_create(pk=1)[0]
