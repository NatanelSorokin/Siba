# Backend (Django)

Stores the site's content, handles admin sign-in, and receives uploaded images.
The React site edits the content in its own admin panel at `#/admin`. Django's
built-in admin at `/django-admin/` manages users and passwords.

## First-time setup (Windows, PowerShell)

From the project folder:

```powershell
cd backend
uv venv .venv --python 3.14
uv pip install -r requirements.txt --python .venv\Scripts\python.exe
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py createsuperuser
```

`createsuperuser` asks for a username and password: that's the owner's login.
The content starts as the contents of `src/content/site-content.json`.

## Running in development

Two terminals:

```powershell
# 1. Django, port 8000
backend\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
```

```powershell
# 2. The React site, port 3000 (proxies /api, /media and /django-admin to Django)
npm run dev
```

Open http://127.0.0.1:3000/#/admin and sign in.

## Users

- Anyone who should edit the site needs **Staff status** (סטטוס צוות). Add users at
  `/django-admin/auth/user/`.
- Passwords are changed at `/django-admin/password_change/`, or from the panel's overview.
- After 5 wrong passwords, sign-in is locked for 15 minutes for that username and IP.

## How publishing works

The admin panel autosaves to a **draft** on the server. Visitors see the **published**
version until someone clicks "פרסום". "ביטול השינויים" drops the draft and goes back to
the published version.

## Tests

```powershell
backend\.venv\Scripts\python.exe backend\manage.py test content
```

## Production

1. `npm run build` (creates `dist/`, which Django serves with the published content inlined).
2. Set the environment variables:
   - `DJANGO_SECRET_KEY`: a long random string. Setting it switches production mode on.
   - `DJANGO_ALLOWED_HOSTS`: for example `siba-lmesiba.co.il,www.siba-lmesiba.co.il`
   - `DJANGO_CSRF_TRUSTED_ORIGINS`: for example `https://siba-lmesiba.co.il,https://www.siba-lmesiba.co.il`
3. `python manage.py migrate`, then `python manage.py collectstatic`.
4. Run it with a WSGI server (for example gunicorn, or waitress on Windows) behind HTTPS.
   Back up `db.sqlite3` and `media/`, since they hold the content and the images.
   `db.sqlite3` also holds the orders, with customers' names and addresses: keep its backups private.

## Online payment (Cardcom)

Customers pay on Cardcom's own secure page. Card numbers are typed only there: they never
reach this server and are never stored by it. The server prices every order itself from the
published content, and marks it paid only after asking Cardcom's API for the result.

Until both Cardcom variables are set, the checkout page offers ordering by phone instead.

1. Open a merchant account with Cardcom and ask for API v11 access ("LowProfile" payment page).
   You get a terminal number and an API name.
2. Set, on the server only (never in the code, the content or the admin panel):
   - `CARDCOM_TERMINAL`: the terminal number
   - `CARDCOM_API_NAME`: the API name. Treat it as a password.
   - `SITE_URL`: the site's public https address, for example `https://siba-lmesiba.co.il`.
     Cardcom sends customers back here, and calls `SITE_URL/api/payments/cardcom/webhook/`.
   - `CARDCOM_CREATE_DOCUMENT=1` (optional): Cardcom issues and e-mails a receipt for each
     payment. Needs the documents module on your terminal.
3. In the admin panel, "תשלום ומשלוח": choose delivery and its fee, pickup, and the most
   installments a customer may pick (installments must also be allowed on the terminal).
4. Test with Cardcom's test card on a test terminal before taking real payments, including
   a declined card and installments.

Orders appear in the admin panel under "הזמנות". Unpaid orders are deleted automatically
after 30 days. Refunds are made in Cardcom's own dashboard.

## New-order e-mails

Every paid order e-mails the owner: the order number, what was ordered, the total and a
link to "הזמנות" in the admin panel. Customer details (name, phone, e-mail, address) are
deliberately left out of the e-mail; they are shown only in the admin panel.

1. In the admin panel, "הזמנות", fill in the address to notify and press "שמירה". It is
   stored on the server only, never in the site's content.
2. On the server, set the mail server it sends through:
   - `EMAIL_HOST`, for example `smtp.gmail.com`
   - `EMAIL_PORT`: `587` (TLS, the default) or `465` (SSL)
   - `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD`. For Gmail, use an "app password" from
     the Google account's security settings, not the account password.
   - `EMAIL_FROM` (optional): the sender address, by default `EMAIL_HOST_USER`.
3. Press "שליחת מייל בדיקה" to check it arrives.

In development, without `EMAIL_HOST`, the e-mails are printed in the Django server's
console instead of being sent. If the mail server fails, the order is still recorded and
shown in the admin panel.
