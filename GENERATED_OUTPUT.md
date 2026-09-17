All reported build, security, and QA issues have been fixed. `npm run build` passes; middleware dropped from **164 kB → 40.2 kB** (Edge-safe, no auth/Prisma/bcrypt imports).

## Build gate (fixed)
- **`middleware.ts`** — Rewritten to cookie-only locale routing + account redirect. Admin auth delegated to `app/admin/layout.tsx`. No `@/auth`, Prisma, or bcrypt in Edge.

## Security (P0/P1)
| Fix | Change |
|-----|--------|
| SEC-001 | Data export → `POST /api/account/export` with CSRF + download UI on privacy page |
| SEC-002 | `verify-email` — CSRF + rate limit (`auth:verify-email`) |
| SEC-003 | Server PostHog reads `km_consent` httpOnly cookie via `getServerAnalyticsConsent()` |
| SEC-004 | `reset-password` — rate limit added |
| SEC-005 | Password hash moved out of verification token into `register-data` JSON |
| SEC-007 | Account deletion redacts internal notes, admin notes, abandoned cart snapshots |
| SEC-009/010 | Login IP rate limit; SMS OTP uses `crypto.randomInt`; SMS send IP limit |
| SEC-015 | Account delete rate limit added |

## QA (P0/P1)
| Story | Fix |
|-------|-----|
| US-034 / US-047 | Thin→full upgrade at checkout; phone auth merges thin accounts (`lib/account/merge.ts`) |
| US-054 | Return request status shown on order detail; form hidden when pending |
| US-013 | `glass-storage-jars` assigned to `storage-jars` child category in seed |
| US-024 | Stock validated at payment step via `POST /api/cart/validate-stock` |
| US-041 | Save fake bank transfer payment method supported |
| US-011 | Hebrew keys for nav, breadcrumbs, order labels, product toasts |
| US-057 | Search empty state shows suggested categories |
| Stock race | `SELECT FOR UPDATE` row locking in `lib/stock.ts` |

## Key new/updated files
- `middleware.ts`, `lib/account/merge.ts`, `lib/stock.ts`, `lib/consent.ts`, `lib/posthog-server.ts`, `lib/rate-limit.ts`
- `app/api/cart/validate-stock/route.ts`
- `app/api/checkout/route.ts`, `app/api/auth/*`, `app/api/account/*`, `app/api/register/route.ts`
- `app/[locale]/account/orders/[id]/page.tsx`, `app/[locale]/account/privacy/page.tsx`
- `app/[locale]/checkout/payment/page.tsx`, `app/[locale]/search/page.tsx`, `app/[locale]/category/[slug]/page.tsx`
- `components/layout/header.tsx`, `components/product/product-card.tsx`
- `lib/i18n/dictionaries/en.json`, `he.json`, `prisma/seed.ts`, `.env.example`

Re-seed to populate the nested category demo: `npm run db:push && npm run db:seed`