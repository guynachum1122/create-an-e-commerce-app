# Kitchen-me

Single-brand B2C e-commerce store for home and kitchen lifestyle goods (EU + UK).

## Stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- PostgreSQL + Prisma ORM
- Auth.js v5 (email/password, Google, Apple)
- **Mock payment provider** (always succeeds; swappable for Stripe)
- Zustand cart state, Resend email (no-op in dev)
- Observability: Sentry, PostHog, Mixpanel, Datadog, Vercel Analytics

## Quick start

```bash
cp .env.example .env
# Set DATABASE_URL and AUTH_SECRET

npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/en`.

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@kitchen-me.com | KitchenMe2026! |
| Worker | worker@kitchen-me.com | KitchenMe2026! |
| Full customer | customer@kitchen-me.com | KitchenMe2026! |
| Thin customer | thin@kitchen-me.com | (no password — guest/thin) |

## Key routes

| Route | Description |
|-------|-------------|
| `/en`, `/he` | Homepage (bilingual) |
| `/en/products/[slug]` | Product detail |
| `/en/category/[slug]` | Category browse |
| `/en/checkout/*` | Multi-step checkout |
| `/admin` | Admin back office |
| `/docs` | AI project documentation |

## Payments

Checkout uses seeded fake credit cards (10) and bank accounts (3). The mock provider in `lib/payments/` always returns success instantly. Replace `getPaymentProvider()` with a Stripe adapter when ready — no raw card data is stored.

## Observability

All tools are key-gated via `.env`. See the **Observability** section in `.env.example`.

## License

Private — Kitchen-me demo store.
