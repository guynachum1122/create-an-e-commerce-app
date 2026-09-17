# Kitchen-me — Vercel + PostgreSQL Deployment Runbook

> **Target:** Vercel (Next.js 15) · PostgreSQL (Neon / Vercel Postgres / Supabase) · GitHub (source of truth)  
> **App slug:** `kitchen-me`  
> **Primary region:** EU (`fra1` — Frankfurt) for EU/UK shoppers

---

## 1. Architecture Overview

```
GitHub (main) ──push──▶ Vercel Project ──serverless──▶ Next.js App
                              │
                              ├── Env vars (Vercel dashboard)
                              └── PostgreSQL (external managed DB)
```

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend / API | Next.js 15 App Router on Vercel | `middleware.ts` handles locale + auth guards |
| Database | PostgreSQL 15+ via Prisma 6 | Requires `pg_trgm` extension |
| Auth | Auth.js v5 (`auth.ts`) | JWT sessions; OAuth optional |
| Payments | Mock provider (`PAYMENT_PROVIDER=mock`) | Required for demo launch |
| Email | Resend (optional) | No-op when `RESEND_API_KEY` blank |
| Observability | Sentry, PostHog, Mixpanel, Datadog, Vercel Analytics | All key-gated |

---

## 2. Prerequisites

### Accounts & services

- [ ] GitHub repository with this codebase pushed to `main`
- [ ] [Vercel](https://vercel.com) account linked to GitHub
- [ ] PostgreSQL provider (pick one):
  - **[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)** (simplest integration)
  - **[Neon](https://neon.tech)** (recommended for serverless + connection pooling)
  - **[Supabase](https://supabase.com)** (Postgres + optional extras)
- [ ] (Production email) [Resend](https://resend.com) account + verified sending domain
- [ ] (Optional) Google Cloud OAuth app, Apple Developer Sign in with Apple
- [ ] (Optional) Sentry, PostHog projects

### Local tooling (for DB bootstrap)

- Node.js 20 LTS
- npm 10+
- `openssl` (to generate `AUTH_SECRET`)

---

## 3. Repository Files (already in repo)

| File | Purpose |
|------|---------|
| `vercel.json` | Framework preset, EU region (`fra1`), build/install commands, API cache headers |
| `package.json` | `build`: `prisma generate && next build`; `postinstall`: `prisma generate` |
| `.env.example` | Local env template |
| `prisma/schema.prisma` | PostgreSQL schema (uses `pg_trgm` extension) |
| `prisma/seed.ts` | Demo catalog, accounts, shipping, fake payment instruments |
| `instrumentation.ts` | Production env validation at startup |

---

## 4. PostgreSQL Setup

### 4.1 Create database

1. Create a PostgreSQL 15+ database in your provider.
2. Enable the **`pg_trgm`** extension (required by `prisma/schema.prisma`):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

3. Copy the connection string. Format:

```
postgresql://USER:PASSWORD@HOST:5432/kitchen_me?sslmode=require
```

### 4.2 Connection pooling (serverless — strongly recommended)

Vercel functions open many short-lived connections. Use your provider's **pooled** connection string as `DATABASE_URL`.

| Provider | Pooled URL | Direct URL (migrations only) |
|----------|------------|--------------------------------|
| Neon | `...-pooler.neon.tech/...` | `...neon.tech/...` (non-pooler) |
| Supabase | port `6543` (transaction pooler) | port `5432` (direct) |
| Vercel Postgres | auto-provided `POSTGRES_URL` | `POSTGRES_URL_NON_POOLING` |

> **Note:** This project currently uses a single `DATABASE_URL` in `schema.prisma`. For pooled production traffic, set `DATABASE_URL` to the **pooled** URL. Run schema push/seed from your laptop or CI using the **direct** URL to avoid pooler limitations during DDL.

### 4.3 Apply schema

The repo ships **without** a `prisma/migrations/` folder. Initial deploy uses `prisma db push`.

**From your local machine (or CI) with direct DB access:**

```bash
# PowerShell
$env:DATABASE_URL = "postgresql://..."   # direct connection string
npm ci
npx prisma db push
```

```bash
# Bash
export DATABASE_URL="postgresql://..."
npm ci
npx prisma db push
```

Verify:

```bash
npx prisma db pull --print   # should reflect schema without errors
```

#### Future: migrate to Prisma Migrate (recommended after v1 launch)

```bash
npx prisma migrate dev --name init
git add prisma/migrations
git commit -m "Add initial Prisma migration"
```

Production updates then use:

```bash
npx prisma migrate deploy
```

---

## 5. Seed Database

> **WARNING:** `prisma/seed.ts` is **destructive** — it deletes all rows in all tables before inserting demo data.  
> **Run only on:** fresh databases, staging, or intentional resets. **Never** on production with real customer data.

```bash
# Requires DATABASE_URL set (direct connection recommended)
npm run db:seed
```

### Seeded demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@kitchen-me.com` | `KitchenMe2026!` |
| Worker | `worker@kitchen-me.com` | `KitchenMe2026!` |
| Full customer | `customer@kitchen-me.com` | `KitchenMe2026!` |
| Thin customer | `thin@kitchen-me.com` | *(no password — thin/guest account)* |

Also seeds: 25 products, categories, collections, shipping rates, pickup locations, 10 fake cards, 3 fake bank accounts, coupons (`WELCOME10`, `KITCHEN15`, `WINTER20`), sample orders.

---

## 6. Environment Variables

Configure in **Vercel → Project → Settings → Environment Variables**.  
Apply to **Production** (and Preview/Development as needed).

### 6.1 Required (production)

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...pooler...?sslmode=require` | Pooled PostgreSQL connection string |
| `AUTH_SECRET` | *(32+ byte random)* | Auth.js session signing secret. Generate: `openssl rand -base64 32` |
| `AUTH_URL` | `https://kitchen-me.vercel.app` | Canonical app URL for Auth.js (no trailing slash) |
| `NEXT_PUBLIC_SITE_URL` | `https://kitchen-me.vercel.app` | Public site URL; used for CSRF origin checks, email links, SEO |
| `PAYMENT_PROVIDER` | `mock` | **Required for demo launch.** Mock payments; set to enable fake card/bank checkout |

> `instrumentation.ts` calls `validateProductionConfig()` which throws if `AUTH_SECRET` or `NEXT_PUBLIC_SITE_URL` is missing.

### 6.2 Required for real email (optional at launch)

| Variable | Example | Description |
|----------|---------|-------------|
| `RESEND_API_KEY` | `re_...` | Resend API key; blank = email no-op (logged only) |
| `EMAIL_FROM` | `Kitchen-me <orders@kitchen-me.com>` | Verified sender in Resend |

### 6.3 OAuth (optional — providers omitted if blank)

| Variable | Description |
|----------|-------------|
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `AUTH_APPLE_ID` | Apple Services ID |
| `AUTH_APPLE_SECRET` | Apple client secret (JWT) |

**OAuth redirect URIs to register:**

```
https://<YOUR_DOMAIN>/api/auth/callback/google
https://<YOUR_DOMAIN>/api/auth/callback/apple
```

### 6.4 Public app branding

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_STORE_NAME` | `Kitchen-me` | Store name in UI/metadata |
| `NEXT_PUBLIC_STORE_DESCRIPTION` | *(see `.env.example`)* | Store tagline |

### 6.5 Observability (optional — all key-gated)

| Variable | Tier | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | 1 | Sentry client DSN |
| `SENTRY_AUTH_TOKEN` | 1 | Sentry auth token (build-time source maps upload) |
| `SENTRY_ORG` | 1 | Sentry organization slug |
| `SENTRY_PROJECT` | 1 | Sentry project slug |
| `NEXT_PUBLIC_POSTHOG_KEY` | 1 | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | 1 | PostHog host (default `https://app.posthog.com`) |
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | 2 | Mixpanel token |
| `DD_API_KEY` | 2 | Datadog API key |
| `DD_APP_KEY` | 2 | Datadog application key |
| `DD_SERVICE` | 2 | Datadog service name (default `kitchen-me`) |
| `DD_ENV` | 2 | Datadog environment (e.g. `production`) |

> Vercel Analytics + Speed Insights load automatically when cookie consent allows analytics (`components/layout/analytics-gate.tsx`). No env vars needed on Vercel.

### 6.6 App tuning (optional — have sensible defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `LOW_STOCK_THRESHOLD` | `5` | Low-stock alert threshold |
| `ABANDONED_CART_HOURS` | `24` | Abandoned cart window |
| `SEARCH_MIN_CHARS` | `2` | Min chars for search |
| `SEARCH_SUGGESTION_LIMIT` | `8` | Max autocomplete suggestions |

### 6.7 Future Stripe swap (not used at launch)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Required when `PAYMENT_PROVIDER` ≠ `mock` in production |

### 6.8 Known gap: SMS auth in production

Phone + SMS login (`/api/auth/sms/send`) logs OTP codes **only in development**. No SMS provider env vars exist yet. For production SMS, integrate Twilio/MessageBird and wire into the SMS route before enabling phone auth for customers.

---

## 7. Vercel Project Setup (step-by-step)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial Kitchen-me e-commerce app"
git remote add origin https://github.com/<org>/kitchen-me.git
git push -u origin main
```

### Step 2 — Import project in Vercel

1. Vercel Dashboard → **Add New → Project**
2. Import the GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `.` (repo root)
5. Build settings (auto-read from `vercel.json` / `package.json`):
   - Install: `npm ci`
   - Build: `prisma generate && next build`
6. Do **not** deploy yet — set env vars first

### Step 3 — Configure environment variables

Add all variables from [Section 6](#6-environment-variables) in Vercel. Minimum production set:

```
DATABASE_URL=...
AUTH_SECRET=...
AUTH_URL=https://<your-domain>
NEXT_PUBLIC_SITE_URL=https://<your-domain>
PAYMENT_PROVIDER=mock
```

Optional but recommended:

```
RESEND_API_KEY=...
EMAIL_FROM=Kitchen-me <orders@your-domain.com>
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
SENTRY_ORG=...
SENTRY_PROJECT=...
```

### Step 4 — Bootstrap database (before first successful deploy)

Run locally or in CI **against the production database** (direct URL):

```bash
npx prisma db push
npm run db:seed        # staging/demo only
```

### Step 5 — Deploy

1. Click **Deploy** (or push to `main` to trigger auto-deploy)
2. Wait for build to complete (`prisma generate` runs in build + postinstall)
3. Assign custom domain (optional): Vercel → Settings → Domains

### Step 6 — Post-deploy domain sync

After adding a custom domain, update:

```
AUTH_URL=https://www.kitchen-me.com
NEXT_PUBLIC_SITE_URL=https://www.kitchen-me.com
```

Redeploy for changes to take effect.

### Step 7 — Resend domain verification (if using email)

1. Add DNS records in Resend for your sending domain
2. Set `EMAIL_FROM` to an address on that domain
3. Send a test order confirmation

---

## 8. Deployment Checklist (ordered)

```
[ ] 1. PostgreSQL instance created (EU region preferred)
[ ] 2. pg_trgm extension enabled
[ ] 3. DATABASE_URL copied (pooled for Vercel, direct for schema ops)
[ ] 4. prisma db push executed successfully
[ ] 5. db:seed executed (staging/demo only)
[ ] 6. AUTH_SECRET generated and stored in Vercel
[ ] 7. AUTH_URL + NEXT_PUBLIC_SITE_URL set to production URL
[ ] 8. PAYMENT_PROVIDER=mock set
[ ] 9. GitHub repo connected to Vercel
[ ] 10. First deploy green
[ ] 11. Custom domain + HTTPS verified
[ ] 12. OAuth redirect URIs updated (if using Google/Apple)
[ ] 13. Resend domain verified (if using email)
[ ] 14. Smoke tests passed (Section 10)
[ ] 15. Rotate demo passwords before public launch
```

---

## 9. Ongoing Operations

### Deploy updates

Push to `main` → Vercel auto-builds and deploys.

### Schema changes

```bash
# Option A: db push (current workflow)
DATABASE_URL="<direct-url>" npx prisma db push

# Option B: migrate deploy (after migrations folder exists)
DATABASE_URL="<direct-url>" npx prisma migrate deploy
```

Then redeploy Vercel (automatic on push, or manual redeploy).

### Rollback

Vercel → Deployments → select previous deployment → **Promote to Production**.

Database rollbacks are manual — restore from provider backup if a bad migration was applied.

### Logs & monitoring

- Vercel → Project → **Logs** (runtime / build)
- Sentry (if configured) for errors
- PostHog/Mixpanel (if configured + user consented) for funnels

---

## 10. Post-Deploy Smoke Test Checklist

Run against production URL. Check each item.

### Health & routing

- [ ] `GET /` redirects to `/en`
- [ ] `GET /he` loads Hebrew homepage
- [ ] `GET /robots.txt` returns valid robots file
- [ ] `GET /sitemap.xml` returns sitemap with product URLs
- [ ] `GET /en/privacy` loads privacy page
- [ ] Cookie consent banner appears; accepting enables analytics scripts

### Storefront

- [ ] Homepage shows featured collections and product grid
- [ ] `/en/category/kitchen` loads with filter sidebar
- [ ] Search (`/en/search?q=bowl`) returns results
- [ ] Search autocomplete suggests products after 2+ characters
- [ ] Product detail page (`/en/products/ceramic-stacking-bowls`) shows variants, price (EUR/GBP), add-to-cart
- [ ] Language switcher toggles EN ↔ HE
- [ ] Currency/region selector switches EUR/GBP pricing

### Cart & checkout

- [ ] Add item to cart → cart drawer shows count
- [ ] Cart persists after page refresh
- [ ] Guest checkout flow: address → shipping → payment → review → confirmation
- [ ] Fake card payment completes instantly
- [ ] Fake bank transfer completes instantly
- [ ] Order confirmation page displays order number
- [ ] Out-of-stock variant blocks checkout

### Auth & accounts

- [ ] Sign in as `customer@kitchen-me.com` succeeds
- [ ] `/en/account/orders` shows order history
- [ ] Sign in as `admin@kitchen-me.com` → `/admin` accessible
- [ ] Sign in as `worker@kitchen-me.com` → `/admin` accessible (orders only)
- [ ] Customer account cannot access `/admin` (redirected)
- [ ] CSRF: POST to `/api/cart` from foreign origin returns 403

### Admin

- [ ] `/admin/products` lists seeded products
- [ ] `/admin/orders` lists orders
- [ ] Worker can update order status; cannot access refunds (admin only)
- [ ] Mark order as **Shipped** → fake tracking number auto-generated
- [ ] Admin refund action succeeds (mock payment)

### Email (if Resend configured)

- [ ] Place test order → confirmation email received
- [ ] Ship test order → shipping update email received

### Observability (if configured)

- [ ] Trigger test error → appears in Sentry
- [ ] Accept analytics cookies → Vercel Analytics/Speed Insights active
- [ ] PostHog receives pageview (if key set + consent given)

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Build fails: `Missing required production env vars` | `AUTH_SECRET` or `NEXT_PUBLIC_SITE_URL` unset at build/runtime | Set both in Vercel Production env |
| Build fails: `Production requires a real payment provider` | `PAYMENT_PROVIDER` not set to `mock` and no `STRIPE_SECRET_KEY` | Set `PAYMENT_PROVIDER=mock` |
| `403 Forbidden` on API POST | CSRF origin mismatch | Ensure `NEXT_PUBLIC_SITE_URL` exactly matches browser URL (scheme + host, no trailing slash) |
| OAuth redirect error | Callback URI mismatch | Add `https://<domain>/api/auth/callback/<provider>` to OAuth app |
| `prisma db push` fails on extension | `pg_trgm` not enabled | Run `CREATE EXTENSION IF NOT EXISTS pg_trgm;` |
| DB connection timeouts on Vercel | Using direct URL without pooler | Switch `DATABASE_URL` to pooled connection string |
| Emails not sent | `RESEND_API_KEY` blank or domain unverified | Configure Resend; check Vercel function logs for `[email:no-op]` |
| SMS login fails silently in prod | No SMS provider wired | Expected — OTP only logged in dev; integrate SMS provider |
| Search returns empty | Full-text indexes not built | Re-run `prisma db push`; verify PostgreSQL `english` text search config |
| Admin 404 / redirect loop | Not signed in or wrong role | Sign in with admin/worker account |

---

## 12. Security Notes for Launch

1. **Rotate demo passwords** (`KitchenMe2026!`) before any public traffic.
2. Keep `PAYMENT_PROVIDER=mock` only for demo/staging; swap to Stripe before accepting real payments.
3. Never commit `.env` — it is gitignored.
4. Store secrets only in Vercel env vars (or your secrets manager).
5. Restrict admin access via strong unique passwords + optional Vercel deployment protection on preview branches.
6. GDPR: cookie consent + account deletion flows are implemented; verify privacy page content matches your legal requirements.

---

## 13. Quick Reference Commands

```bash
# Local dev
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev

# Production schema sync (direct DB URL)
DATABASE_URL="postgresql://..." npx prisma db push

# Demo seed (destructive)
DATABASE_URL="postgresql://..." npm run db:seed

# Generate AUTH_SECRET
openssl rand -base64 32

# Verify production build locally
npm run build && npm start
```

---

*Last updated: 2026-09-18 · App version 1.0.0*
