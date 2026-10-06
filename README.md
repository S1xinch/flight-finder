# Flight Finder

Free flight price comparison: live fares, 30-day price history, deal detection, accounts, and price-drop email alerts.
No affiliate links; booking buttons go straight to the booking site.

Stack: Next.js (App Router) + Tailwind + Recharts, Neon Postgres, Upstash Redis, Bright Data (Google Flights), Resend, Vercel.

## Setup

1. Copy `.env.example` to `.env.local` and fill it in.
2. `npm install`
3. `npm run migrate` (creates the tables in Neon)
4. `npm run dev`

`npm test` runs the unit tests, `npm run typecheck` checks types.

## Deploy (Vercel)

1. Import this repo in Vercel. Add the Neon and Upstash Redis integrations (they set `DATABASE_URL` and the Redis variables).
2. Add the remaining variables from `.env.example`: `BRIGHTDATA_API_KEY`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `APP_URL`, `RESEND_API_KEY`, `MAIL_FROM`.
3. Run `npm run migrate` once against the production `DATABASE_URL`.
4. In this GitHub repo add secrets `APP_URL` and `CRON_SECRET` so the scheduled workflow can refresh watched routes.

## How it works

- `/api/search` validates the query and returns cached results (Redis, 1 hour). On a miss it reads Google Flights
  directly with the vendored [fli-js](src/vendor/fli/NOTICE.md) client (1-3 seconds, no credits, capped by
  `DIRECT_DAILY_CAP`). If that fails it falls back to a Bright Data lookup (minutes, capped by `DAILY_SEARCH_CAP`).
  Three direct failures in a row pause the direct path for 10 minutes. Set `SEARCH_PROVIDER=brightdata` to switch it off.
  Either way the cheapest fare is logged to `price_history`.
- The direct read is unofficial and may break or be blocked when Google changes its page; that is what the fallback is for.
- `/api/status` shows live flight status for saved flights near their travel day (Aviationstack, free plan: 100 requests a month).
- Deal = price at or below 90% of the route's 30-day average (needs 3+ observations). High = 110% or more.
- `.github/workflows/refresh.yml` calls `/api/cron` every 6 hours. It re-prices the stalest watched routes and emails due alerts.
- Booking records are encrypted at rest (AES-256-GCM). Passwords use bcrypt (12 rounds). Sessions are 24-hour JWTs in an HTTP-only cookie.

## Data limits

The Bright Data Google Flights feed provides airline, flight number, times, duration, stops and price. It does not
provide fare breakdowns, baggage rules, seat prices, aircraft type, ratings or emissions, so the app does not show them.
