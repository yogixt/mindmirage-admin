# Mind Mirage · Team Portal

Internal management portal for Mind Mirage (Advaita Sadhana Kutir,
Rishikesh). Team-only — gated by email allow-list and password.

## What it manages

- Dashboard — sadhaks, orders, revenue, pending work at a glance
- Vageshwari — compose and publish to the enrolled sadhaks' feed
- Assignments — lesson uploads (text, files, video links), submission
  review with marks and remarks, per-sadhak progress
- Availability — master calendar: blocked days, slot requests,
  confirmed bookings, scheduled live classes
- Bookings — approve or decline requested class dates
- Sadhaks — profiles, enrolments (manual add/remove)
- Orders — purchases and the full payment log
- Coupons — discount codes, applied instantly at checkout
- Inbox — every site form submission, with replies
- Access log — append-only record of portal logins

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Turso (libSQL).
Authentication is a signed cookie issued against `ADMIN_EMAILS` +
`ADMIN_PASSWORD`; `AUTH_SECRET` signs the session token.

## Development

```bash
pnpm install
pnpm dev
```

Required environment variables are listed in `.env.example`. The portal
shares its database and user directory with the main site.
