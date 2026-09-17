# Kitchen-me E-Commerce — Risk-Based Testing Plan

**Product:** Kitchen-me — single-brand B2C store (EU + UK)  
**Stack:** Next.js 15, TypeScript, Prisma/PostgreSQL, Auth.js v5, MOCK payments, Vercel  
**Scope:** MVP (69 user stories, US-001 – US-069)  
**Plan version:** 1.0  
**Date:** 2026-09-17  
**Author:** RBT Agent

---

## 1. EXECUTIVE SUMMARY

Kitchen-me is a revenue-critical B2C e-commerce MVP where checkout, inventory integrity, authentication, and GDPR compliance carry the highest business and regulatory exposure. The overall risk posture is **elevated-but-manageable**: the launch uses a MOCK payment provider (reducing PCI scope but not eliminating payment-flow logic risk), operates in EU/UK (GDPR mandatory), and implements complex account models (guest, thin, full) with order-merge semantics that are easy to get wrong. Stock auto-decrement with concurrent checkout, dual-currency fixed pricing, coupon eligibility restricted to full accounts, and admin/worker role separation are the dominant functional failure modes. Security risks cluster around auth abuse (four auth methods + SMS OTP), XSS on user-entered fields, and RBAC bypass in admin. Quality risks include bilingual (EN/HE) UI regressions, search/filter accuracy, and transactional email reliability. This plan prioritises **Critical and High** risks with heavy integration and e2e coverage on checkout, stock, payments, account merge, and compliance flows; defers lower-impact polish (SEO, wishlist, analytics dashboard depth) and explicitly out-of-scope v2 features to a later cycle.

---

## 2. RISK REGISTER

| Risk ID | Risk Name | Description | Likelihood | Impact | Risk Level | Affected Features | Mitigation Strategy |
|---------|-----------|-------------|------------|--------|------------|-------------------|---------------------|
| **R-01** | Stock overselling | Concurrent orders or race conditions decrement stock below zero; shopper charged for unavailable SKU | H | H | **Critical** | MVP-031, MVP-032, US-023, US-024, US-042 | Atomic DB transactions; pessimistic row lock on Variant; re-validate stock at payment; integration tests with parallel checkout |
| **R-02** | Checkout payment failure / orphan orders | Order created without successful payment, or payment succeeds without order/stock decrement | M | H | **Critical** | MVP-055–057, US-037–039, US-042 | Single transactional boundary for order + payment + stock; idempotency keys on payment; rollback on partial failure |
| **R-03** | Incorrect order totals (currency/discount/shipping) | EUR/GBP mismatch, wrong tax-inclusive totals, coupon miscalculation, or shipping rate applied to wrong region | M | H | **Critical** | MVP-022, MVP-053, MVP-058, US-015, US-035, US-040, US-042 | Unit tests on pricing engine; golden-path fixtures per region; coupon boundary tests |
| **R-04** | Thin → full account merge data loss | Prior guest/thin orders not reassigned when user registers with matching email OR phone | M | H | **Critical** | MVP-074, US-033, US-047, US-049 | Merge job in same transaction as registration; audit `mergedFromUserId`; e2e merge scenarios |
| **R-05** | PCI / sensitive payment data exposure | Raw card number, CVV, or expiry persisted in DB, logs, or client storage | L | H | **High** | MVP-055–056, US-037–038, US-041 | Code review + DB schema audit; no PAN fields; mock instrument references only; security scan |
| **R-06** | Auth brute-force / credential stuffing | Unlimited login, SMS OTP, or registration attempts enable account takeover or SMS cost abuse | M | H | **High** | MVP-007, MVP-070–072, US-007, US-043, US-045 | Rate limiting (429); OTP attempt cap (5); generic login errors; integration abuse tests |
| **R-07** | Admin RBAC bypass | Worker performs catalog edits, refunds, or accesses internal notes via API | M | H | **High** | MVP-100, US-058, US-064 | Server-side role checks on every admin route; negative permission tests; no client-only gating |
| **R-08** | GDPR non-compliance | Cookie consent bypass, missing deletion flow, or PII retained after deletion request | M | H | **High** | MVP-004–006, US-004–006 | Consent-gated scripts; deletion job with session revoke; compliance checklist QA |
| **R-09** | XSS via user-generated content | Unescaped names, return reasons, or internal notes execute scripts in admin/customer UI | M | H | **High** | MVP-008, US-008, US-054, US-062 | Output encoding; CSP headers; injection test payloads in QA |
| **R-10** | Checkout blocked incorrectly (false OOS) | Valid in-stock cart rejected at payment due to stale cache or merge bug | M | M | **High** | MVP-032, US-024, US-026 | Real-time stock read at payment; cart merge respects stock caps; e2e happy path |
| **R-11** | Coupon eligibility bypass | Guest/thin account applies coupon reserved for full accounts | M | M | **High** | MVP-058, US-040, US-067 | Server-side `accountType=FULL` check; API rejects unauthorized redemption |
| **R-12** | Refund integrity failure | Partial/full refund does not update Payment record or restores wrong amount; worker initiates refund | L | H | **High** | MVP-105, US-064 | Admin-only refund endpoint; mock provider sync; ledger reconciliation tests |
| **R-13** | Order cancellation stock not restored | Cancel before ship fails to increment variant stock | M | M | **High** | MVP-104, US-063 | Cancel transaction restores stock atomically; verify PDP stock after cancel |
| **R-14** | OAuth / phone auth account linking errors | Duplicate users, failed session, or orphaned Account rows on Google/Apple/SMS sign-in | M | M | **High** | MVP-071–072, US-044–045 | Auth.js adapter tests; link-by-email/phone rules; e2e per provider |
| **R-15** | Transactional email delivery failure | Order confirmation or shipping update not sent (Resend misconfig, silent dev no-op in prod) | M | M | **High** | MVP-082–083, US-051–052 | Prod smoke with Resend; event logging; retry queue (if implemented) |
| **R-16** | Fake tracking not generated on shipped | Admin marks SHIPPED but customer sees no tracking number or email | M | M | **High** | MVP-106, US-050, US-065 | Hook on status transition; unit test generator uniqueness; e2e admin → customer |
| **R-17** | Search / filter incorrect results | Full-text misses variant attributes; filters fail intersection or wrong currency price band | M | M | **Medium** | MVP-025–026, US-018–019 | PostgreSQL FTS integration tests; filter matrix QA |
| **R-18** | Bilingual (EN/HE) UI regression | Untranslated strings, RTL layout breaks, or wrong locale on checkout/emails | M | M | **Medium** | MVP-011, US-011 | i18n key coverage scan; visual QA both locales; Hebrew checkout e2e |
| **R-19** | Verified rating eligibility bypass | Non-purchaser or undelivered order submits star rating | M | M | **Medium** | MVP-090, US-055 | Server-side eligibility: DELIVERED + orderItem ownership |
| **R-20** | Cart persistence / merge corruption | Guest cart lost on refresh; login merge drops items or exceeds stock | M | M | **Medium** | MVP-040, US-026 | Cookie/session persistence tests; merge quantity cap logic |
| **R-21** | Saved payment method misuse | Thin/guest saves payment; raw data stored | L | M | **Medium** | MVP-059, US-041 | Full-account-only guard; reference-token storage audit |
| **R-22** | Return request workflow breakage | Customer cannot submit; admin queue missing; status not reflected | L | M | **Medium** | MVP-085, US-054, US-066 | e2e return submit → admin approve/deny |
| **R-23** | SEO / structured data errors | Missing schema.org, broken sitemap, or wrong OG tags hurt discoverability | L | M | **Low** | MVP-009, US-009 | Automated SEO snapshot tests; manual spot check |
| **R-24** | Performance degradation at checkout | Slow API/DB under load causes timeout and abandoned checkout | M | M | **Medium** | MVP-050, US-032 | Load test checkout path; p95 latency alerts |
| **R-25** | Wishlist unauthorized access | Guest wishlist persisted without auth or cross-user leakage | L | M | **Low** | MVP-044, US-030 | Auth-required API; userId scoping tests |
| **R-26** | Abandoned cart data incomplete | Ops cannot query abandoned carts for future campaigns | L | L | **Low** | MVP-045, US-031 | Foundation hook verification only |
| **R-27** | Analytics dashboard inaccuracy | Admin revenue/order counts wrong for EUR/GBP split | L | M | **Low** | MVP-109, US-068 | Seed data reconciliation; manual dashboard QA |

**Risk level key:** Critical = immediate launch blocker if untested; High = must test before release; Medium = targeted regression; Low = sample-based coverage.

---

## 3. TEST PRIORITY MATRIX

| Risk ID | Unit | Integration | E2E | Manual | Performance | Security | User Stories / Acceptance Criteria |
|---------|:----:|:-----------:|:---:|:------:|:-----------:|:--------:|-----------------------------------|
| **R-01** | ✓ stock decrement logic | ✓ concurrent order placement | ✓ two-browser race on last unit | ✓ warehouse spot-check | ✓ checkout under load | — | US-023, US-024, US-042, US-063; cross-cutting stock integrity |
| **R-02** | ✓ payment adapter | ✓ order+payment+stock transaction | ✓ card + bank full checkout | ✓ payment failure UX | ✓ payment endpoint latency | ✓ no orphan records | US-037–039, US-042 |
| **R-03** | ✓ pricing, coupon, shipping calc | ✓ checkout total API | ✓ EU vs UK totals with coupon | ✓ visual total review step | — | — | US-015, US-035, US-040, US-042 |
| **R-04** | ✓ merge service | ✓ registration + order reassignment | ✓ thin checkout → full register | ✓ email vs phone match cases | — | — | US-033, US-047, US-049 |
| **R-05** | ✓ schema validation | ✓ payment persistence | ✓ checkout inspect network | ✓ DB audit | — | ✓ PCI scan, log review | US-037–038, US-041 |
| **R-06** | ✓ rate limit bucket | ✓ 429 responses | ✓ brute login attempt | — | ✓ auth endpoint load | ✓ OWASP auth tests | US-007, US-043, US-045 |
| **R-07** | ✓ permission helpers | ✓ admin API routes | ✓ worker UI paths | ✓ direct API curl | — | ✓ privilege escalation | US-058, US-064 |
| **R-08** | ✓ consent state | ✓ deletion job | ✓ consent banner + deletion | ✓ legal checklist | — | ✓ privacy review | US-004–006 |
| **R-09** | ✓ escape utilities | ✓ API output | ✓ inject in return/name | — | — | ✓ XSS payloads | US-008, US-054, US-062 |
| **R-10** | ✓ stock read | ✓ cart validation | ✓ checkout happy path | ✓ cache timing | — | — | US-024, US-026 |
| **R-11** | ✓ coupon eligibility | ✓ checkout apply API | ✓ guest vs full coupon | — | — | ✓ API bypass attempt | US-040, US-067 |
| **R-12** | ✓ refund calculator | ✓ mock provider refund | ✓ admin partial refund | ✓ ledger review | — | ✓ worker refund blocked | US-064 |
| **R-13** | ✓ restock logic | ✓ cancel transaction | ✓ cancel → PDP stock | — | — | — | US-063 |
| **R-14** | ✓ auth callbacks | ✓ OAuth/SMS flows | ✓ Google, Apple, phone login | ✓ provider config | — | ✓ session fixation | US-044–045 |
| **R-15** | ✓ email templates | ✓ Resend hook | ✓ order → email received | ✓ template content | — | — | US-051–052 |
| **R-16** | ✓ tracking generator | ✓ status transition hook | ✓ admin ship → customer view | — | — | — | US-050, US-065 |
| **R-17** | ✓ filter query builder | ✓ FTS queries | ✓ search + filter UI | ✓ Hebrew search | ✓ search p95 | — | US-018–019, US-057 |
| **R-18** | ✓ locale helpers | ✓ i18n routing | ✓ EN/HE checkout | ✓ RTL visual QA | — | — | US-011 |
| **R-19** | ✓ eligibility rules | ✓ rating API | ✓ rate after delivery | — | — | ✓ API bypass | US-055–056 |
| **R-20** | ✓ merge algorithm | ✓ cart API | ✓ refresh + login merge | — | — | — | US-026–027 |
| **R-21** | ✓ save guard | ✓ saved payment CRUD | ✓ full account save/reuse | — | — | ✓ storage audit | US-041 |
| **R-22** | — | ✓ return API | ✓ customer → admin queue | ✓ admin approve | — | — | US-054, US-066 |
| **R-23** | ✓ sitemap generator | — | ✓ PDP meta tags | ✓ Search Console | — | — | US-009 |
| **R-24** | — | ✓ checkout API | ✓ full funnel | — | ✓ k6/Artillery checkout | — | US-032 |
| **R-25** | ✓ auth guard | ✓ wishlist API | ✓ signed-in wishlist | — | — | — | US-030 |
| **R-26** | — | ✓ abandoned cart upsert | — | ✓ admin query | — | — | US-031 |
| **R-27** | ✓ aggregation | ✓ dashboard API | ✓ admin dashboard | ✓ number reconciliation | — | — | US-068 |

**Priority execution order:** R-01 → R-02 → R-03 → R-04 → R-05 → R-06 → R-07 → R-08 (Critical/High blockers first), then R-09–R-16, then Medium/Low as capacity allows.

---

## 4. TEST SCENARIOS PER RISK

### R-01 — Stock Overselling (Critical)

1. **Concurrent last-unit race**
   - **Given** variant SKU `KM-JAR-SAGE-M` has `stockQuantity = 1`
   - **When** two authenticated shoppers submit payment for qty 1 within 500 ms
   - **Then** exactly one order reaches `PROCESSING` with stock decremented to 0; the second receives an out-of-stock error and no charge/order is created

2. **Stock re-validation at payment step**
   - **Given** shopper A adds last unit to cart and reaches payment; admin sets stock to 0 in another session
   - **When** shopper A submits payment
   - **Then** payment is rejected with error naming the unavailable SKU; cart prompts update; no order row created

3. **Multi-line partial OOS**
   - **Given** cart has two variants: one in stock (qty 2), one OOS (qty 0)
   - **When** shopper proceeds to payment step
   - **Then** checkout blocked before payment with clear message identifying OOS line item

4. **Atomic decrement on multi-qty order**
   - **Given** variant stock = 10
   - **When** order placed for qty 7
   - **Then** stock becomes 3 in same DB transaction as order creation; `OrderItem.stockDecremented = true`

5. **Cancel restores stock before re-order**
   - **Given** order for qty 3 cancelled while status = PROCESSING
   - **When** another shopper attempts checkout for same variant qty 3
   - **Then** checkout succeeds and stock decrements correctly from restored level

---

### R-02 — Checkout Payment Failure / Orphan Orders (Critical)

1. **Successful card instant confirmation**
   - **Given** in-stock cart and seeded fake card selected
   - **When** shopper confirms on review step
   - **Then** Payment `SUCCEEDED`, Order `PROCESSING`, stock decremented, confirmation page and email hook fired — all or nothing

2. **Mock provider failure rollback**
   - **Given** mock payment adapter configured to fail on specific test card
   - **When** payment submitted
   - **Then** no Order row persisted (or order marked failed with no stock decrement); shopper sees retry message

3. **Bank transfer parity with card**
   - **Given** shopper selects one of 3 seeded fake bank accounts
   - **When** payment submitted
   - **Then** instant `SUCCEEDED` identical to card; no `PENDING` payment state

4. **Idempotent retry after network timeout**
   - **Given** shopper double-clicks "Place order" or client retries with same idempotency key
   - **Then** only one order and one payment created

5. **Guest thin account linked to order**
   - **Given** guest checkout with name, email, phone
   - **When** payment succeeds
   - **Then** `User.accountType=THIN` exists and `Order.userId` references it

---

### R-03 — Incorrect Order Totals (Critical)

1. **EU tax-inclusive subtotal**
   - **Given** UK shopper with GBP prices on variants (no conversion)
   - **When** viewing cart and review step
   - **Then** line totals use `effectivePriceGbpCents`; no additional tax line appears

2. **EU flat shipping applied**
   - **Given** shipping address in Germany (EU)
   - **When** shipping step completes
   - **Then** EU standard flat rate added; UK rate not applied

3. **Percentage coupon on full account**
   - **Given** full account, active coupon `SAVE10` (10% off), subtotal €100
   - **When** coupon applied at checkout
   - **Then** `discountCents = 1000`, total reflects subtotal − discount + shipping

4. **Expired coupon rejection**
   - **Given** coupon past `expiresAt`
   - **When** applied at checkout
   - **Then** API returns validation error; total unchanged

5. **Pickup delivery shipping charge**
   - **Given** EU address and pickup point selected
   - **When** review step displayed
   - **Then** correct pickup-associated shipping rate per admin config; `pickupLocationId` stored on order

---

### R-04 — Thin → Full Account Merge Data Loss (Critical)

1. **Merge on matching email**
   - **Given** thin account `a@b.com` with 2 completed orders
   - **When** user registers full account with same email (new phone)
   - **Then** both orders appear in full account history; thin user has `mergedFromUserId` / merged flag

2. **Merge on matching phone only**
   - **Given** thin account with phone `+447700900123` and different email
   - **When** full registration uses same phone
   - **Then** all thin orders reassigned to full account

3. **No merge on unrelated identifiers**
   - **Given** thin account `a@b.com`
   - **When** new full account registers with `x@y.com` and different phone
   - **Then** no cross-merge; histories remain separate

4. **Merged orders in order history UI**
   - **Given** successful merge scenario
   - **When** customer opens `/account/orders`
   - **Then** pre-merge thin orders listed with correct totals, status, and delivery type

5. **Cart preserved post-merge registration**
   - **Given** thin checkout completed; user later registers full account with matching email
   - **When** registration completes
   - **Then** order history complete; new session is full account type

---

### R-05 — PCI / Sensitive Payment Data Exposure (High)

1. **Database schema audit**
   - **Given** production-like schema after checkout
   - **When** inspecting Payment, SavedPaymentMethod, Order tables
   - **Then** no columns contain full PAN, CVV, or expiry — only fake instrument IDs and last-four display fields

2. **Network payload inspection**
   - **Given** checkout payment submission
   - **When** browser devtools capture request/response
   - **Then** no raw card data in JSON bodies beyond seeded selection reference

3. **Saved payment stores reference only**
   - **Given** full account opts "Save payment method"
   - **When** order succeeds
   - **Then** `SavedPaymentMethod` references `fakeCardId`; reorder uses saved reference

4. **Server logs sanitization**
   - **Given** failed payment attempt
   - **When** reviewing application logs (Sentry/Datadog)
   - **Then** no PAN/CVV appears in error payloads

5. **Stripe-ready interface boundary**
   - **Given** payment service abstraction
   - **When** swapping MOCK for Stripe adapter in test harness
   - **Then** checkout UI code unchanged; no direct card field persistence added

---

### R-06 — Auth Brute-Force / Credential Stuffing (High)

1. **Login rate limit**
   - **Given** same IP attempts login 6 times in 1 minute
   - **When** 6th request sent
   - **Then** HTTP 429 returned; no user enumeration in error body

2. **SMS OTP rate limit**
   - **Given** phone number requests OTP repeatedly
   - **When** threshold exceeded
   - **Then** HTTP 429; no OTP sent

3. **OTP attempt cap**
   - **Given** valid OTP issued
   - **When** user enters wrong code 5 times
   - **Then** code invalidated; new OTP request required

4. **Checkout payment rate limit**
   - **Given** same session submits payment 11 times in 1 minute
   - **When** 11th attempt occurs
   - **Then** HTTP 429 before payment processing

5. **Generic login error**
   - **Given** valid email with wrong password
   - **When** login attempted
   - **Then** same error message as non-existent email

---

### R-07 — Admin RBAC Bypass (High)

1. **Worker blocked from product CRUD**
   - **Given** authenticated worker session
   - **When** POST `/admin/api/products` or UI save attempted
   - **Then** 403 Forbidden; no catalog change

2. **Worker blocked from refund**
   - **Given** worker on order detail page
   - **When** refund API called directly
   - **Then** 403; no Refund record created

3. **Worker allowed order status update**
   - **Given** worker credentials
   - **When** status changed PROCESSING → SHIPPED
   - **Then** action succeeds; tracking auto-generated

4. **Worker internal notes isolated**
   - **Given** worker adds internal note
   - **When** customer fetches order detail API
   - **Then** internal note absent from response

5. **Admin full access**
   - **Given** admin session
   - **When** product CRUD, refund, and order cancel attempted
   - **Then** all actions succeed per role matrix

---

### R-08 — GDPR Non-Compliance (High)

1. **Cookie consent blocks analytics**
   - **Given** first visit, consent not given
   - **When** page loads
   - **Then** non-essential cookies/scripts not set; banner shows Accept/Reject with privacy link

2. **Reject persists**
   - **Given** user rejects non-essential cookies
   - **When** browsing subsequent pages
   - **Then** analytics/marketing cookies remain unset

3. **Data deletion request**
   - **Given** authenticated full account
   - **When** deletion requested from account settings
   - **Then** `DataDeletionRequest` created; sessions revoked; PII anonymized; financial orders retained anonymized

4. **Privacy policy reachable**
   - **Given** any storefront page
   - **When** Privacy Policy clicked from footer or banner
   - **Then** `/privacy` renders in current locale (EN/HE shell)

5. **Post-deletion login blocked**
   - **Given** completed deletion job
   - **When** former credentials used to login
   - **Then** authentication fails; no PII recoverable via account API

---

### R-09 — XSS via User-Generated Content (High)

1. **Return reason injection**
   - **Given** customer submits return reason `<script>alert(1)</script>`
   - **When** admin views return queue
   - **Then** script rendered as escaped text; no execution

2. **Customer name in order detail**
   - **Given** checkout name contains HTML/script payload
   - **When** admin views order
   - **Then** output escaped in admin UI

3. **Internal note display**
   - **Given** worker adds note with `<img onerror=...>`
   - **When** another admin views notes
   - **Then** content escaped; CSP prevents inline execution

4. **API JSON response safety**
   - **Given** stored XSS payload in return reason
   - **When** customer fetches own return status
   - **Then** JSON contains escaped/safe string; frontend does not use `dangerouslySetInnerHTML`

5. **Star rating UI has no text field**
   - **Given** rating form on PDP
   - **When** inspected
   - **Then** no free-text review input at MVP (reduces XSS surface)

---

### R-10 — Checkout Blocked Incorrectly (High)

1. **In-stock happy path**
   - **Given** all cart lines `stockQuantity > quantity`
   - **When** shopper completes address → shipping → payment → review
   - **Then** no false OOS error; order placed successfully

2. **Post-login cart merge respects stock**
   - **Given** guest cart qty 2 + account cart qty 2 for variant with stock 3
   - **When** login merge occurs
   - **Then** merged qty capped at 3 with user notification

3. **Fresh stock read at payment**
   - **Given** stock restored after cancel (R-13)
   - **When** same variant added and checkout completed
   - **Then** checkout succeeds without stale cache block

4. **Variant switch on PDP**
   - **Given** product with one OOS and one in-stock variant
   - **When** in-stock variant selected and added to cart
   - **Then** checkout proceeds normally

5. **Express shipping availability flag**
   - **Given** EU address and `expressAvailable=false`
   - **When** shipping step loads
   - **Then** express hidden; standard/pickup still selectable — no checkout block

---

### R-11 — Coupon Eligibility Bypass (High)

1. **Guest coupon field hidden**
   - **Given** guest checkout session
   - **When** payment/review step loads
   - **Then** coupon field hidden or disabled with full-account message

2. **Thin account API rejection**
   - **Given** thin account session
   - **When** coupon apply API called directly with valid code
   - **Then** 403/422; discount not applied

3. **Full account success**
   - **Given** full account and valid coupon
   - **When** coupon applied
   - **Then** discount reflected in review total and stored on Order

4. **One coupon per order**
   - **Given** coupon already applied
   - **When** second coupon submitted
   - **Then** rejected per MVP no-stacking rule

5. **Usage limit enforced**
   - **Given** coupon at `usageLimit` reached
   - **When** full account attempts redemption
   - **Then** validation error; order total unchanged

---

### R-12 — Refund Integrity Failure (High)

1. **Partial refund ledger**
   - **Given** €50 order paid successfully
   - **When** admin issues €10 partial refund via mock provider
   - **Then** `Refund` record created; `Payment.refundedCents=1000`; order status `PARTIALLY_REFUNDED`

2. **Full refund status**
   - **Given** same order
   - **When** remaining €40 refunded
   - **Then** order status `REFUNDED`; total refunded equals payment amount

3. **Worker refund blocked**
   - **Given** worker session
   - **When** refund endpoint invoked
   - **Then** 403; payment unchanged

4. **Mock provider sync**
   - **Given** refund initiated
   - **When** mock provider returns success
   - **Then** `providerRefundId` stored; customer order history shows refunded status

5. **Refund exceeds payment rejected**
   - **Given** €50 payment
   - **When** admin attempts €60 refund
   - **Then** validation error; no partial state corruption

---

### R-13 — Order Cancellation Stock Not Restored (High)

1. **Cancel before ship restocks**
   - **Given** order PROCESSING with line qty 2 for variant stock previously decremented
   - **When** admin/worker cancels order
   - **Then** variant stock += 2; order status CANCELLED

2. **Cannot cancel after shipped**
   - **Given** order status SHIPPED
   - **When** cancel attempted
   - **Then** action rejected or unavailable; stock unchanged

3. **Customer visibility**
   - **Given** cancelled order
   - **When** customer views order history
   - **Then** status CANCELLED visible in timeline

4. **Concurrent reorder after cancel**
   - **Given** cancelled order restored stock
   - **When** new customer purchases same variant
   - **Then** checkout succeeds (links to R-01 integrity)

5. **Internal cancel reason stored**
   - **Given** admin cancels with reason
   - **When** order detail viewed in admin
   - **Then** `cancelReason` stored; not exposed to customer API

---

### R-14 — OAuth / Phone Auth Account Linking Errors (High)

1. **Google OAuth new user**
   - **Given** no existing account for Google email
   - **When** OAuth completes
   - **Then** User + Account rows created; session established; account area accessible

2. **Apple OAuth links existing email user**
   - **Given** existing email/password user
   - **When** Apple OAuth uses same email
   - **Then** Account linked to same User; no duplicate user

3. **Phone OTP registration**
   - **Given** new phone number
   - **When** valid OTP entered within expiry
   - **Then** session created; User with `phoneVerified` set

4. **Phone login rate limit**
   - **Given** repeated OTP requests
   - **When** limit exceeded
   - **Then** 429 (ties to R-06)

5. **Password reset email/password user**
   - **Given** registered email user
   - **When** password reset requested
   - **Then** VerificationToken created; reset completes with new password (dev no-op email)

---

### R-15 — Transactional Email Delivery Failure (High)

1. **Order confirmation on placement**
   - **Given** order placed in staging with Resend configured
   - **When** transaction commits
   - **Then** confirmation email received with orderNumber, items, total

2. **Shipping update on SHIPPED**
   - **Given** admin sets order to SHIPPED
   - **When** status saved
   - **Then** shipping email sent with auto-generated trackingNumber

3. **Dev no-op does not break checkout**
   - **Given** dev environment with email no-op
   - **When** order placed
   - **Then** order succeeds; email hook logs without throwing

4. **Email content matches order snapshot**
   - **Given** bilingual customer with HE locale at checkout
   - **When** confirmation sent (EN default MVP)
   - **Then** line items and totals match Order record exactly

5. **In-account mirror without email**
   - **Given** email delivery fails silently
   - **When** customer opens order history
   - **Then** order and status still visible (dual-channel resilience)

---

### R-16 — Fake Tracking Not Generated on Shipped (High)

1. **Auto-generate on status change**
   - **Given** order without `trackingNumber`
   - **When** admin/worker sets status to SHIPPED
   - **Then** unique trackingNumber generated (e.g. `KMTRK` prefix); `shippedAt` set

2. **Customer tracking page**
   - **Given** shipped order
   - **When** customer opens order tracking
   - **Then** trackingNumber displayed; no manual admin entry required

3. **Pre-ship pending state**
   - **Given** order PROCESSING
   - **When** customer views tracking
   - **Then** "not yet shipped" message; no tracking number shown

4. **Tracking uniqueness**
   - **Given** 100 orders shipped in test batch
   - **When** tracking numbers inspected
   - **Then** all unique

5. **Email includes tracking**
   - **Given** order marked SHIPPED
   - **When** shipping email sent
   - **Then** body contains same trackingNumber as account UI

---

## 5. RECOMMENDED TEST COVERAGE TARGETS

Minimum coverage percentages by test layer, weighted by risk level. These are **floors**, not ceilings — Critical-risk modules should aim above the High-risk target.

| Test Layer | Critical-Risk Modules | High-Risk Modules | Medium-Risk Modules | Low-Risk Modules |
|------------|----------------------:|------------------:|--------------------:|-----------------:|
| **Unit** | ≥ 90% line / 85% branch | ≥ 80% line / 75% branch | ≥ 70% line | ≥ 50% line (sample) |
| **Integration (API + DB)** | ≥ 85% of Critical acceptance criteria | ≥ 75% of High criteria | ≥ 60% of Medium criteria | Smoke only |
| **E2E (Playwright/Cypress)** | 100% of Critical user journeys (5 journeys min) | ≥ 80% of High journeys | ≥ 50% of Medium journeys | Optional happy path |
| **Manual / Exploratory** | Full Critical checklist each release | High checklist each sprint | Rotating Medium charter | Ad hoc |
| **Security** | 100% OWASP Top 10 relevant checks on checkout/auth/admin | Auth + XSS + RBAC suite | Annual-style spot checks | — |
| **Performance** | Checkout p95 baseline established | Checkout + search under load | Catalog browse sampling | — |

**Critical-risk modules (must meet Critical column):**
- Stock/inventory service (`Variant.stockQuantity`, order placement transaction)
- Checkout orchestration (multi-step, totals, payment adapter)
- Account merge service
- Payment persistence layer (MOCK provider)
- Admin RBAC middleware

**High-risk modules:**
- Auth (email, OAuth, phone OTP, rate limits)
- Coupon engine
- Refund/cancel flows
- GDPR consent + deletion
- Email hooks (order confirm, ship update)
- Tracking generation on status transition

**Coverage measurement notes:**
- Unit coverage scoped to `src/lib/checkout/**`, `src/lib/inventory/**`, `src/lib/pricing/**`, `src/lib/auth/**`, not blanket repo percentage
- Integration coverage measured as % of Given/When/Then criteria mapped in Section 3 with automated tests
- E2E journeys: guest checkout, full account checkout + coupon, thin→full merge, concurrent stock, admin ship + tracking, worker permission denial

---

## 6. RISKS DEFERRED / OUT OF SCOPE

| Item | Related Risk | Reason Deferred |
|------|--------------|-----------------|
| **Real Stripe / live payment processing** | Payment fraud, 3DS, webhook replay | LATER-007; MVP uses MOCK only — production payment risks not in this cycle |
| **PayPal, Apple Pay, Google Pay, BNPL** | Alternative payment failures | LATER-012; not in discovery scope |
| **Subscription / repeat-order products** | Recurring billing, dunning | Explicitly out of scope Round 5 (LATER-002) |
| **Multi-address address book** | Address validation complexity | Explicitly out of scope Round 4 (LATER-001) |
| **Written product reviews + moderation** | UGC moderation, review XSS at scale | Star ratings only at MVP; LATER-003 |
| **Automated abandoned-cart recovery emails** | Email fatigue, opt-out compliance | LATER-004; foundation hook (R-26) only |
| **Gift cards / store credit** | Ledger, fraud, partial redemption | Ambiguous scope; defaulted LATER-005 |
| **Live chat / in-app support** | Real-time PII in chat logs | LATER-006 |
| **SMS transactional notifications** | SMS deliverability, cost abuse | LATER-008; SMS used for auth OTP only |
| **Full self-service returns portal** | Return label integration, auto-refund | Manual admin approval only; LATER-010 |
| **Per-country EU shipping rules** | Shipping calc complexity | Single EU rate at MVP; LATER-011 |
| **Advanced coupon rules (stacking, category scope)** | Promo abuse permutations | LATER-009; MVP one coupon, no stacking |
| **Hebrew transactional email parity** | i18n email rendering | LATER-020; EN email default |
| **Carrier name on tracking** | Carrier API integration | LATER-018; tracking number only |
| **A/B testing & cohort analytics depth** | Experiment validity | LATER-019; basic admin dashboard only |
| **Terms of Service / Imprint pages** | Legal completeness | LATER-014; privacy page in MVP |
| **Penetration test (third-party)** | Full security audit | Recommended pre-production; not MVP sprint scope |
| **Load test at Black-Friday scale** | Extreme traffic | Baseline checkout load only (R-24); full scale pre-launch hardening |

**Risk acceptance note:** Deferred items must not block MVP launch sign-off if Critical/High risks in Section 2 pass. Product owner must explicitly accept MOCK payment and manual returns limitations.

---

## 7. RUNTIME VALIDATION MAP

Operational dashboard specification: for each **Critical** and **High** risk, engineering monitors the listed tool, metric, and threshold. A breach indicates the risk has materialised in production or staging.

| Risk ID | Observability Tool | Metric / Event / Alert Name | Healthy Threshold | Breach = Risk Materialised |
|---------|-------------------|----------------------------|-------------------|---------------------------|
| **R-01** | Sentry | `checkout.stock_unavailable` error count / checkout attempts | < 2% of checkout payment attempts | ≥ 2% = Stock overselling or false OOS (R-01) active |
| **R-01** | Datadog | `inventory.stock_quantity` custom metric (negative values) | = 0 variants with negative stock | Any negative stock = Stock integrity breach (R-01) |
| **R-01** | PostHog | Funnel: `checkout_started` → `payment_failed` (reason: out_of_stock) | < 1% drop at payment for OOS | ≥ 1% sustained = Stock validation failure (R-01) |
| **R-02** | Sentry | `checkout.orphan_order` / payment-order mismatch exceptions | 0 per hour | ≥ 1 per hour = Payment/order atomicity failure (R-02) |
| **R-02** | Datadog | `checkout.place_order` transaction duration p99 | < 3 s | ≥ 3 s = Checkout timeout / partial failure risk (R-02) |
| **R-02** | Mixpanel | `order_placed` without preceding `payment_succeeded` event | 0 mismatches | Any mismatch = Orphan order risk (R-02) |
| **R-03** | Sentry | `checkout.total_mismatch` validation errors | 0 per day | ≥ 1 = Pricing/total calculation bug (R-03) |
| **R-03** | PostHog | `coupon_applied` → `checkout_abandoned` at review step | < 5% | ≥ 5% spike = Coupon/total distrust (R-03) |
| **R-03** | Datadog | `pricing.calculate_total` API latency p95 | < 200 ms | ≥ 200 ms = Pricing path degradation (R-03) |
| **R-04** | Sentry | `account.merge_failed` unhandled exceptions | 0 per day | ≥ 1 = Thin→full merge failure (R-04) |
| **R-04** | Mixpanel | `full_account_registered` cohort with `prior_thin_orders_visible` = true | 100% within 24 h | < 100% = Merge data loss (R-04) |
| **R-04** | PostHog | Session replay tag `merge-order-missing` (manual QA sample) | 0 confirmed cases / week | Any confirmed = R-04 materialised |
| **R-05** | Sentry | Security rule: PAN pattern in breadcrumbs/message | 0 hits | Any hit = PCI data exposure (R-05) |
| **R-05** | Datadog | Log scan alert `cvv\|card_number\|pan` in app logs | 0 matches | Any match = Sensitive data in logs (R-05) |
| **R-06** | Datadog | `auth.login` 429 rate / total login attempts | 429 rate < 5% of attempts | ≥ 5% sustained = Brute-force or limit misconfig (R-06) |
| **R-06** | Sentry | `auth.otp_max_attempts_exceeded` events | < 10/day | ≥ 10/day = OTP abuse (R-06) |
| **R-06** | Datadog | `checkout.payment` 429 responses | < 1% of payment POSTs | ≥ 1% = Checkout abuse (R-06) |
| **R-07** | Sentry | `admin.forbidden` 403 on worker token (catalog/refund routes) | Expected blocks only; 0× 200 on forbidden routes | Worker 200 on refund/catalog = RBAC bypass (R-07) |
| **R-07** | Datadog | `admin.api` custom metric by route + role | Worker: 0 refunds, 0 product writes | Non-zero = RBAC breach (R-07) |
| **R-08** | PostHog | `cookie_consent_rejected` users with analytics cookies set | 0% | > 0% = GDPR consent bypass (R-08) |
| **R-08** | Sentry | `gdpr.deletion_job_failed` errors | 0 per week | ≥ 1 = Data deletion failure (R-08) |
| **R-08** | Datadog | `gdpr.deletion_completed` SLA from request | < 72 h p95 | ≥ 72 h = Compliance SLA breach (R-08) |
| **R-09** | Sentry | CSP violation reports / XSS attempt blocked | Informational only; 0 executed scripts | CSP bypass execution = XSS risk (R-09) |
| **R-09** | Datadog | `api.response` containing unescaped `<script` in JSON (custom lint) | 0 | ≥ 1 = XSS output encoding failure (R-09) |
| **R-10** | PostHog | Funnel drop `cart_valid` → `checkout_payment` (non-OOS users) | < 3% unexplained drop | ≥ 3% = False checkout block (R-10) |
| **R-10** | Sentry | `checkout.false_oos` tagged errors | 0 per day | ≥ 1 = Incorrect OOS rejection (R-10) |
| **R-11** | Sentry | `coupon.unauthorized_account_type` (expected 403/422) vs `coupon.applied` for thin/guest | 0 successful thin/guest applies | Any success = Coupon bypass (R-11) |
| **R-11** | Mixpanel | `coupon_applied` segmented by `account_type` | 100% full account | Any guest/thin = Eligibility bypass (R-11) |
| **R-12** | Sentry | `refund.provider_mismatch` / refund ledger errors | 0 per week | ≥ 1 = Refund integrity failure (R-12) |
| **R-12** | Datadog | `payment.refunded_cents` > `payment.amount_cents` | 0 records | Any record = Over-refund (R-12) |
| **R-13** | Datadog | Custom check: stock after cancel ≠ stock_before + cancelled_qty | 0 failures | Any failure = Restock on cancel broken (R-13) |
| **R-13** | Sentry | `order.cancel_restock_failed` exceptions | 0 | ≥ 1 = Cancel stock restore failure (R-13) |
| **R-14** | Sentry | `auth.oauth_callback_error` / `auth.phone_verify_failed` rate | < 0.5% of auth attempts | ≥ 0.5% = Auth linking failure (R-14) |
| **R-14** | PostHog | Funnel `oauth_started` → `session_created` | ≥ 95% conversion | < 95% = OAuth/phone flow breakage (R-14) |
| **R-15** | Sentry | `email.order_confirmation_failed` / `email.shipping_update_failed` | < 0.5% of orders | ≥ 0.5% = Email delivery failure (R-15) |
| **R-15** | Datadog | Resend webhook bounce/complaint rate (if integrated) | < 1% | ≥ 1% = Transactional email health issue (R-15) |
| **R-16** | Sentry | `order.shipped_missing_tracking` (SHIPPED without trackingNumber) | 0 | ≥ 1 = Tracking generation failure (R-16) |
| **R-16** | Mixpanel | `order_shipped` events with `tracking_number` property populated | 100% | < 100% = Fake tracking not generated (R-16) |

**Cross-cutting storefront performance (supports R-24, checkout UX):**

| Risk ID | Observability Tool | Metric / Event / Alert Name | Healthy Threshold | Breach = Risk Materialised |
|---------|-------------------|----------------------------|-------------------|---------------------------|
| **R-24** | Vercel Analytics | Checkout route LCP | < 2.5 s | ≥ 2.5 s = Checkout perf risk (R-24) |
| **R-24** | Vercel Analytics | Checkout route CLS | < 0.1 | ≥ 0.1 = Layout instability at checkout (R-24) |
| **R-24** | Datadog | `POST /api/checkout/place-order` p95 latency | < 800 ms | ≥ 800 ms = Checkout API degradation (R-24) |

---

**Document status:** Ready for QA execution, test automation agent, and observability instrumentation agent.  
**Next steps:** Map Risk IDs to test cases in test management tool; instrument Sentry tags and Datadog custom metrics per Section 7 before staging sign-off.
