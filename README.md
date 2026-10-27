# সহজযাত্রা / Sohoj Seva — Node.js + SQLite

A lightweight Bengali-first travel and assistance request portal. It accepts requests for flight/train ticket assistance, hospital appointments, visa support and other help. It does **not** buy or issue tickets itself.

## Requirements
- Node.js 20 or newer
- npm
- Linux or Windows

## Run locally
1. Extract the ZIP and open a terminal in this folder.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env`.
4. Change `ADMIN_PASSWORD` to a long, unique password (at least 16 characters).
5. Run: `npm start`
6. Open `http://localhost:3001`; admin: `http://localhost:3001/admin`.

Default port is **3001**. On hosts that provide a `PORT` environment variable, the app uses that value automatically. It binds to `0.0.0.0` by default. Health endpoint: `/health`.

## Hosting and SQLite persistence
- Use a Node.js-capable VPS/host and run this as a long-lived Node process (PM2 or the provider's process manager).
- Attach a **persistent disk/volume** and set `DB_PATH` to a file on that volume, for example `/var/lib/sohoj-seva/sohoj-seva.sqlite`. Create the directory and ensure the app user can write to it.
- SQLite is best for one app instance on a persistent local disk. Do not run multiple replicas sharing a SQLite file over an unreliable network filesystem. Back up the database file regularly; with WAL mode, stop the app or use SQLite's backup facilities for consistent backups.
- If your host manages TLS, configure the domain and certificate in its dashboard and proxy HTTPS to the app. Do not hard-code HTTPS in Express. For a VPS, configure Nginx/Caddy as a reverse proxy and obtain a certificate for the exact domain/subdomain. `ERR_SSL_UNRECOGNIZED_NAME_ALERT` commonly points to a domain/SNI/certificate binding mismatch; verify DNS records, certificate names and hosting panel domain mapping.
- Some shared PHP hosting plans do not support persistent Node.js processes. Verify Node.js app support before buying a plan.

## Admin features
- View latest service requests and change status (Pending, In Progress, Completed, Cancelled).
- Change guest count manually using a positive or negative delta.
- Automatic guest-count rule: start from 9761, then add `2 × day-of-month` once per calendar date. The initial value may already include today's automatic increment after first start.
- Review moderation: Pending, Approved or Hidden. Only Approved reviews are public.
- **Delete permanently** removes a review row from SQLite after browser confirmation.
- Admin uses HTTP Basic Authentication from `ADMIN_USER` and `ADMIN_PASSWORD`.

## Environment variables
See `.env.example`: `PORT`, `HOST`, `ADMIN_USER`, `ADMIN_PASSWORD`, `DB_PATH`, `SITE_NAME`, `WHATSAPP_NUMBER`.

## Important notes
- Bootstrap is loaded from a CDN, so the public page needs internet access for styling and mobile navigation.
- The 15-minute reply time is presented as an estimate, not a guarantee.
- This starter stores contact details and request messages. Protect the admin password, restrict server access, use HTTPS, and keep backups. For a public production deployment, add a privacy policy, data-retention process, CAPTCHA/anti-spam, and stronger admin accounts before collecting sensitive medical documents. Do not ask users to submit medical reports or identity documents through this basic form.
- This code does not send WhatsApp messages or emails automatically. The WhatsApp option records the user's preferred contact method only.
- The attached reference image was used for the visual direction: white navigation, teal/navy/gold palette, Bengali-first headings, service tiles, request form and review panel. The design is responsive and inspired by the reference, but it is not a pixel-perfect reproduction of every small panel in the composite image.
