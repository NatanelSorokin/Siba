"""
Content from before the product catalog: the navbar's links become catalog
categories (each with its own page), and checkout settings are added.
"""

import json

from django.conf import settings
from django.db import migrations


def upgrade(doc, seed):
    if not isinstance(doc, dict):
        return doc
    doc = dict(doc)
    if 'catalog' not in doc:
        doc['catalog'] = seed['catalog']
    if 'checkout' not in doc:
        doc['checkout'] = seed['checkout']
    doc.pop('header', None)
    # Home-page category tiles that still link nowhere: point them at the matching category page.
    by_name = {c['name']: c['id'] for c in doc['catalog'].get('categories', [])}
    for tile in (doc.get('categories') or {}).get('items', []):
        if isinstance(tile, dict) and tile.get('href') in ('', '#') and tile.get('title') in by_name:
            tile['href'] = f"/category/{by_name[tile['title']]}"
    return doc


def forwards(apps, schema_editor):
    SiteContent = apps.get_model('content', 'SiteContent')
    seed = json.loads(settings.DEFAULT_CONTENT_PATH.read_text(encoding='utf-8'))
    for obj in SiteContent.objects.all():
        obj.draft = upgrade(obj.draft, seed)
        obj.published = upgrade(obj.published, seed)
        obj.save(update_fields=['draft', 'published'])


class Migration(migrations.Migration):
    dependencies = [('content', '0002_order')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
