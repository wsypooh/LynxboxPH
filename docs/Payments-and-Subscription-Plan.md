# Payments and Subscription

**Status:** Implemented locally (2026-09-24), `tsc --noEmit` passes in both `api/` and `lynxbox-ph/`, `next build` succeeds, `terraform validate` passes — **not yet deployed**. Built on top of `docs/Pricing-Strategy-Plan.md`'s already-implemented `Account`/`PLAN#` entity, `AccountRepository`, `PLAN_LIMITS`, `resolveActor().plan`, and `reconcilePropertyListingsForPlan()`. See "Implementation notes" at the end of this doc for exact deviations found while building, and `infra/scripts/deploy-lambda.ps1`/`deploy-infra.ps1` (new EventBridge rule + routes) before this reaches any real environment.

## Context

LynxboxPH currently has no way to charge for the product — every account is implicitly unlimited and free. This plan makes the approved tiers actually sellable: manual GCash/bank-transfer payments now (card automation later), a 30-day trial on signup/upgrade, admin-verified payment proof, automatic lapse-to-Free handling, and lightweight promo codes.

Three distinct roles matter here, to avoid confusion: a **tenant** (a landlord's renter) is never involved in any of this. An **account/owner** is Lynxbox's paying customer — a landlord subscribing to a plan. **Platform-admin** is the Lynxbox operator, using the existing cross-account admin dashboard (`docs/RBAC-Admin-Plan.md`). This plan is entirely about the second and third of those.

This plan also gives the platform-admin dashboard several more *write* actions on top of the manual plan-toggle `Pricing-Strategy-Plan.md` already added (that one, not this plan, turned out to be platform-admin's actual first write action — `docs/RBAC-Admin-Plan.md` was corrected accordingly during that earlier work). Payment approve/reject, trial extension, and promo-code management are additional narrow, billing-scoped exceptions to the dashboard's "read-only for account/tenant/property/invoice data" stance — none of it touches tenant data or tenant-facing behavior.

**Trimmed from `Pricing-Strategy-Plan.md`'s scope** (to avoid building throwaway work — see that doc's section 6 for the full note): its "Request Upgrade" email-button flow is fully superseded by the real payment-submission flow here — it should not be built. Its homepage CTA redesign should still ship, but with Starter/Growth/Business buttons pointing at plain `/auth/signup`, same as Free — this plan adds `?plan=&cycle=` query params to those same links later, a one-line change, not rework. Its manual admin `PUT /api/admin/accounts/{accountId}/plan` endpoint should still be built as scoped there — it's a permanent tool (comps/manual overrides), not replaced by anything here.

## How users subscribe (end-to-end flow)

1. **Free signup** stays exactly as it is today (100% client-side Cognito, zero backend call) — no action needed, `AccountRepository.getPlan()`'s lazy default already makes a brand-new account Free from day one.
2. **Homepage pricing CTAs** for Starter/Growth/Business link to `/auth/signup?plan=starter&cycle=monthly` (etc.) instead of plain signup. The signup page carries `plan`/`cycle` through its existing `/auth/confirm-signup?email=...` redirect as extra query params.
3. **First login after confirmation** lands on `/dashboard/billing?plan=...&cycle=...` (or the plain billing page for an organic Free signup, no special prompt). If a plan param is present and `hasUsedTrial` is false, the page prominently offers "Start your 30-day free trial of Starter."
4. **Starting a trial** calls `POST /api/billing/start-trial` — the first real backend write for that account (creates/updates the `Account`/`PLAN#` row, same lazy-create-on-first-write pattern already used for `MEMBER#` rows). Sets `subscriptionStatus='trialing'`, 30-day `trialEndsAt`. No payment info required.
5. **Existing accounts upgrading** reach the same billing page anytime via a persistent "Upgrade" affordance (dashboard usage banner, nav link). If `hasUsedTrial` is already true, the UI shows "Request Plan Change" instead of "Start Trial," which opens the payment-submission form directly (no second trial — anti-abuse, one trial per account ever).
6. **Paying**: the billing page's payment form collects method (GCash/bank transfer), reference number, an optional promo code, and a proof upload (image/PDF), and submits a `PaymentSubmission`. This emails the platform admin. The proof file is **not** a `Document` entity — it's stored directly on the `PaymentSubmission` record (`proofS3Key`/`proofFileName`, its own S3 prefix `accounts/<accountId>/payment-proofs`), entirely separate from the Documents feature's `DocumentRepository`/S3 paths, so it never counts against that plan's `maxDocumentBytes` limit.
7. **Verification**: platform-admin reviews pending submissions in a new dashboard queue, views the proof via a presigned URL, and approves or rejects (dashboard-only — no email action links, to avoid signed-token/magic-link complexity). Approval activates the plan for a period whose length matches what was actually paid for — `currentPeriodEnd = now + 365 days` if `requestedBillingCycle` was annual, `+30 days` if monthly (paying for the year genuinely means one period is a year, not twelve). Rejection notifies the customer with a reason and lets them resubmit.
8. **Lapsing**: a daily cron job handles trial expiry and payment due-dates automatically (see Enforcement below).

## Implementation Plan

### 1. Data model

**Extended `Account` / `PLAN#` row** (same row `Pricing-Strategy-Plan.md` creates — `PK: ACCOUNT#<accountId>`, `SK: PLAN#<accountId>`). Adds to the existing `{ plan, planUpdatedAt }`:

```ts
type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'past_due';
type BillingCycle = 'monthly' | 'annual';

subscriptionStatus: SubscriptionStatus;   // default 'free'
billingCycle?: BillingCycle;
hasUsedTrial: boolean;                    // one trial ever, anti-abuse
trialStartedAt?: string;
trialEndsAt?: string;
trialEndingSoonNotifiedAt?: string;       // idempotency guard for the reminder email
trialExtendedByAdminAt?: string;
trialExtensionNotes?: string;
currentPeriodStart?: string;
currentPeriodEnd?: string;                // cron's "is payment due" check
pastDueSince?: string;                    // cron's "14 days past due" check
listingsHiddenReason?: 'past_due' | null; // temporary, reversible listing hide
pendingPlan?: PaidPlan;                   // denormalized convenience from a pending submission
pendingBillingCycle?: BillingCycle;
lastVerifiedPaymentSubmissionId?: string;
promoCode?: string;                       // currently-applied promo
promoPeriodsRemaining?: number;           // decremented on each approved renewal using it
```

**New entity: `PaymentSubmission`** (`api/src/models/paymentSubmission.ts`). `EntityType.PAYMENT_SUBMISSION`, `PK: PAYMENT_SUBMISSION#<id>`, `SK: PAYMENT_SUBMISSION#<id>`, `GSI1PK: ACCOUNT#<accountId>`, `GSI1SK: PAYMENT_SUBMISSION#<status>#<submittedAt>#<id>` (per-account history query). Append-only history — no soft delete. Fields: `accountId, submittedBySub, requestedPlan, requestedBillingCycle, method ('gcash'|'bank_transfer'), referenceNumber, amountClaimed, promoCode?, amountExpected, proofS3Key, proofFileName, status ('pending'|'verified'|'rejected'), adminNotes?, verifiedBySub?, verifiedAt?, submittedAt`.

**New entity: `PromoCode`** (`api/src/models/promoCode.ts`). `EntityType.PROMO_CODE`, `PK: PROMO_CODE#<CODE>`, `SK: PROMO_CODE#<CODE>` (normalized uppercase, direct-lookup key — no GSI1 needed; admin's "list all codes" uses a small Scan, same low-cardinality tradeoff as `PlatformAdminRepository`). Fields: `code, discountType ('percent'|'fixed'), discountValue, durationPeriods (default 1 — number of billing periods the discount applies to, cycle-agnostic so it means the same thing for monthly or annual payers), autoApply (boolean — shows automatically on pricing/plan-picker vs. requires the customer to type it), applicablePlans?, maxRedemptions?, redemptionCount, expiresAt?, active, notes?`.

New `EntityType` values (`api/src/lib/dynamodb.ts`): `ACCOUNT` (from `Pricing-Strategy-Plan.md`), `PAYMENT_SUBMISSION`, `PROMO_CODE`.

**New config: `api/src/lib/pricing.ts`** (sibling to `planLimits.ts`, not overlapping):

```ts
export const PLAN_PRICING: Record<PaidPlan, { monthly: number; annual: number }> = {
  starter:  { monthly: 699,  annual: 6990 },
  growth:   { monthly: 1499, annual: 14990 },
  business: { monthly: 2990, annual: 29990 },
};
export function calculateAmountDue(plan, cycle, promo?: PromoCode | null): { baseAmount, discountAmount, amountDue }
```

### 2. Backend

**Repositories** — all follow the existing static-method + dynamic `update()` builder convention (`api/src/repositories/documentRepository.ts` is the reference shape):

- `AccountRepository` (extends `Pricing-Strategy-Plan.md`'s base): `getSubscription`, `startTrial`, `applyVerifiedPayment`, `markPastDue`, `revertToFree`, `extendTrial`, `clearListingsSuspension`, `listAllSubscriptions()` (Scan, filtered `SK begins_with 'PLAN#'` — used only by the cron job; IAM already grants `dynamodb:Scan` on `Resource: "*"`, same precedent as `platformAdminRepository.ts`).
- `PaymentSubmissionRepository` (new): `create`, `findById`, `listByAccount` (GSI1 Query), `listPending()` (Scan filtered `entityType=PAYMENT_SUBMISSION AND status=pending`), `update`.
- `PromoCodeRepository` (new): `create`, `findByCode`, `listAll()` (Scan), `update`.

**Shared lifecycle logic** (`api/src/lib/subscriptionLifecycle.ts`, new): `revertAccountToFree(accountId)` — calls `AccountRepository.revertToFree`, the reusable `reconcilePropertyListingsForPlan(accountId, 'free')` function from `Pricing-Strategy-Plan.md`, clears `listingSuspended` on all properties, sends the "downgraded to Free" email. Used by both the trial-expiry and the 14-day-past-due-expiry cron branches — one function, not duplicated logic.

**`resolveActor()` extension** (`api/src/lib/auth.ts`): after `Pricing-Strategy-Plan.md` adds `actor.plan` via one Get, this adds `actor.subscriptionStatus` from the same row (zero extra query cost). New `canManageBilling(actor)` helper (`role === 'owner'`, mirrors `canManageMembers`) gates billing-decision endpoints (start-trial, submit payment) — these must **never** be blocked by the past_due check below, since paying is how an account cures past_due.

**Enforcement — the key mechanism**: extend the three existing RBAC gates to also fail closed on `past_due`:

```ts
export function canWrite(actor: Actor): boolean {
  if (actor.subscriptionStatus === 'past_due') return false;
  return actor.role === 'owner' || actor.role === 'manager' || actor.role === 'staff';
}
// same one-line addition to canDestroy() and canManageMembers()
```

Because every existing handler already gates writes through these three functions (per this repo's documented handler convention), this single change enforces "past_due blocks all writes" across the entire app with **zero per-handler edits**. Reads stay open — "limited use," not a full lockout, so customers can still see their data to decide to pay.

**Listing suspension** (immediate, reversible, separate from `Pricing-Strategy-Plan.md`'s permanent `status: 'unlisted'` downgrade mechanism): new `Property.listingSuspended?: boolean` field. Set `true` for *all* of an account's active listings the instant it goes `past_due` (`Promise.all` over `PropertyRepository.listByOwner`, matching this repo's per-item-Promise.all convention), cleared the instant payment is verified (or superseded by the real unlisting pass if the 14-day window lapses). `listPublicProperties`/`searchPublicProperties` (`api/src/handlers/properties/handler.ts`) get one more JS-side filter condition alongside `Pricing-Strategy-Plan.md`'s `expiresAt` check: exclude `listingSuspended === true`.

**Daily cron** (`api/src/handlers/subscriptionCron/handler.ts`, `SubscriptionCronHandler.processDaily()`), one pass over `AccountRepository.listAllSubscriptions()`, four checks per account:
1. `trialing` + `trialEndsAt` within 3 days + not yet notified → reminder email (idempotent via `trialEndingSoonNotifiedAt`).
2. `trialing` + `trialEndsAt` passed → `revertAccountToFree()`.
3. `active` + `currentPeriodEnd` passed → `markPastDue()` + suspend all listings + "payment due" email. **Immediate** — this is what actually enforces "can't use the system until you pay," not the 14-day window.
4. `past_due` + `pastDueSince` ≥ 14 days ago → `revertAccountToFree()` (same function as #2 — documents untouched, oldest-excess listings unlisted per `Pricing-Strategy-Plan.md` section 4, listing suspension flag cleared/superseded).

**Cron infrastructure — this is the SAME Lambda function as the API, not a second one**, avoiding a whole new deploy pipeline. Confirmed by directly reading the Terraform: `infra/main.tf` only ever calls `module "naming"`, `module "auth"`, `module "database"`, `module "s3"`, `module "api"`, and `module "frontend"` — the real, actually-deployed `aws_lambda_function.api` is declared directly inside `infra/modules/api/main.tf:150`. (`infra/modules/lambda/` was found to be dead, unreferenced Terraform during this plan's design and should be deleted as a small cleanup, independent of everything else here.) New Terraform (`infra/modules/api/cron.tf`, same module so it can reference `aws_lambda_function.api` directly) adds: `aws_cloudwatch_event_rule` (`schedule_expression = "rate(1 day)"`), `aws_cloudwatch_event_target` pointing at it with a JSON `input` carrying `{ source: "lynxboxph.scheduler", "detail-type": "daily-subscription-check" }`, and `aws_lambda_permission` for principal `events.amazonaws.com`.

`api/src/index.ts` needs one new branch **before** the existing `event.httpMethod`/`event.path` dispatch (an EventBridge-invoked event has neither):
```ts
if (event.source === 'lynxboxph.scheduler' && event['detail-type'] === 'daily-subscription-check') {
  await SubscriptionCronHandler.processDaily();
  return { statusCode: 200 };
}
```
This isn't an HTTP route, so the usual 3-file registration rule doesn't apply — for local testing, add a plain npm script (`api/package.json`) that directly imports and invokes `SubscriptionCronHandler.processDaily()`, bypassing the Lambda-event-shape question entirely.

### 3. New HTTP routes

Every row needs the usual 3-file registration (`api/serverless.yml`, `infra/modules/api/routes.tf` with the JWT authorizer, `api/local-server.ts`) except the two public ones, which omit the authorizer like other `/api/public/*` routes.

| Method | Path | Purpose | Guard |
|---|---|---|---|
| GET | `/api/billing/status` | current plan/subscription/trial countdown | `resolveActor` (read) |
| GET | `/api/billing/usage` | usage vs. `PLAN_LIMITS` for dashboard stats | `resolveActor` (read) |
| POST | `/api/billing/start-trial` | begin 30-day trial of a chosen plan | `canManageBilling` |
| POST | `/api/billing/payment-submissions/upload-url` | presign S3 upload for proof | `canManageBilling` |
| POST | `/api/billing/payment-submissions` | create submission after S3 upload | `canManageBilling` |
| GET | `/api/billing/payment-submissions` | own account's submission history | `resolveActor` (read) |
| POST | `/api/billing/downgrade-to-free` | self-serve, immediate switch to Free | `canManageBilling` |
| GET | `/api/billing/promo-codes/validate` | validate a code, compute discounted price (account-aware — see note below) | `resolveActor` (read) |
| GET | `/api/public/promo-codes/active-auto-apply` | current sitewide auto-apply promo, if any | none |
| GET | `/api/platform-admin/payment-submissions` | list all (filterable by status) | `isPlatformAdmin` |
| GET | `/api/platform-admin/payment-submissions/{id}/view-url` | presigned URL to view the proof file | `isPlatformAdmin` |
| POST | `/api/platform-admin/payment-submissions/{id}/approve` | verify + activate plan/period | `isPlatformAdmin` |
| POST | `/api/platform-admin/payment-submissions/{id}/reject` | reject with reason | `isPlatformAdmin` |
| POST | `/api/platform-admin/accounts/{accountId}/extend-trial` | case-by-case trial extension, or re-grant one on a lapsed account (see note below) | `isPlatformAdmin` |
| GET/POST | `/api/platform-admin/promo-codes` | list / create codes | `isPlatformAdmin` |
| PUT | `/api/platform-admin/promo-codes/{code}` | edit a code (discount, duration, cap, dates, autoApply, reactivate) | `isPlatformAdmin` |
| PUT | `/api/platform-admin/promo-codes/{code}/deactivate` | deactivate a code | `isPlatformAdmin` |

`GET /api/billing/promo-codes/validate` moved from `/api/public/*` to `/api/billing/*` after initial implementation — see Implementation notes #9.

New handler files: `api/src/handlers/billing/handler.ts` (`BillingHandler`, most-specific-path-first dispatch — upload-url before the generic submissions list), `api/src/handlers/platformAdmin/paymentVerificationHandler.ts` (kept separate from the existing `dashboardHandler.ts` per its own read-only scope, same `isPlatformAdmin(event)` bare-check pattern), a small `PublicBillingHandler` for the two public promo routes. `index.ts` gets matching new path branches, ordered before the existing `propertyHandler` fallback.

### 4. Frontend

New feature folder `lynxbox-ph/src/features/billing/`: `types.ts`, `services/billingService.ts` (full GET/POST convention like `documentService.ts`, including the same presign→XHR-PUT→confirm 3-step upload flow reused verbatim from `DocumentUploadModal.tsx`), `services/paymentVerificationService.ts` (admin side).

Components (all in `features/billing/components/`, as-built — not `PlanPickerGrid` as originally sketched): `PricingComparisonTable.tsx` (the actual homepage comparison-table layout, not a card grid — see `Pricing-Strategy-Plan.md`'s own "as built" note — reused as-is between the homepage, `/pricing`, and the billing page, now with a Monthly/Annual toggle and live auto-apply-promo pricing built in), `PricingCtaButton.tsx` (the per-tier CTA — auth-aware: signed out sees "Get Started" → signup, signed in sees "Current Plan"/"Switch Plan"/"Downgrade", non-owners see the same button disabled with a tooltip), `PaymentSubmissionForm.tsx` (method radio incl. GCash/Maya/Bank Transfer, reference number, promo code field — hidden while an auto-apply promo is active, receiving-details display, strikethrough pricing with a "First month only"-style duration note), `PaymentReceivingDetails.tsx` (QR code or placeholder + copyable account details per method), `SubscriptionStatusCard.tsx`, admin `PaymentSubmissionsQueue.tsx` and `PromoCodeManager.tsx` (icon-button + `Tooltip` row actions, matching `DocumentList.tsx`/`InvoiceList.tsx` exactly, including the clickable-row + `stopPropagation` pairing; `PromoCodeManager` supports full editing, not just create/deactivate). `pricingMath.ts` holds the client-side eligibility/amount/duration-label logic shared across these.

Pages: `dashboard/billing/page.tsx` (main billing hub — plan comparison, trial/switch/downgrade actions, payment submission, history), `pricing/page.tsx` (new — fixes the dashboard's previously-dead `/pricing` link), `dashboard/platform-admin/payments/page.tsx` (queue — static, no dynamic route; see Implementation notes #1 for why the originally-sketched `[submissionId]` detail page wasn't built), `dashboard/platform-admin/promo-codes/page.tsx` (static, modals for create/edit).

**Dashboard usage stats**: add a "X of Y used" line to the existing "Active Listings" stat card, plus a new row for Invoices this month / Documents / Team seats — all sourced from `GET /api/billing/usage`, reusing the same `Stat`/`StatLabel`/`StatNumber`/`StatHelpText` Chakra pattern already in `dashboard/page.tsx`. Wire the dead "Upgrade Now" banner (`dashboard/page.tsx` ~409-416) to this same real data — correct copy (drop "Professional," use the new tier names), link to `/dashboard/billing`.

**Cleanup**: delete the confirmed-dead `features/profile/components/SubscriptionManagement.tsx` scaffold and its mocked `ProfileService.getSubscriptionPlans`/`updateSubscription`/`UserProfile.subscription`. Replace the live-but-non-functional "Subscription" tab in `dashboard/profile/page.tsx` (~586-618) with a minimal real status card + a "Manage Billing" link to `/dashboard/billing`, rather than duplicating the full billing UI inline.

### 5. Docs to update as part of this implementation

- `docs/Pricing-Strategy-Plan.md` and `docs/RBAC-Admin-Plan.md` already carry forward-compatibility notes pointing at this plan — no further edits needed there unless the design changes during implementation.
- This doc itself should be updated with a "Status: implemented" note and any real deviations found during build, matching this repo's convention for `docs/Ledger-Plan.md`/`docs/RBAC-Admin-Plan.md`/`docs/Documents-Feature-Plan.md`.

## Verification

1. Local: exercise every new `/api/billing/*` and `/api/platform-admin/*` route via `test.http`/Postman against `npm run dev`, including a full upload-url → S3 PUT → confirm cycle for payment proof.
2. Cron: manually backdate a test account's `trialEndsAt`/`currentPeriodEnd`/`pastDueSince` (DynamoDB console or a quick script), run the new local npm script, confirm all four transition branches fire correctly.
3. Confirm suspended/unlisted properties actually disappear from `/api/public/properties` and `/api/public/search`, and reappear correctly after payment or re-listing.
4. `next build` (not just `tsc`/`lint`) to catch any missed `generateStaticParams` split on the new `[submissionId]` route — this repo's static-export gotcha doesn't show up in type-checking.
5. Full manual walkthrough: signup with `?plan=growth&cycle=monthly` → confirm → login → start trial → verify `actor.plan`/`subscriptionStatus` reflected app-wide (dashboard usage stats, property-creation limit) → submit payment with a promo code → admin email fires → platform-admin views proof → approves → customer's plan/status and confirmation email update correctly.
6. After sandbox deploy (`deploy-infra.ps1 -Environment dev` for the new EventBridge rule, `deploy-lambda.ps1 -Environment dev` for the code — both required, per this repo's standing rule that they're separate steps): manually trigger the EventBridge rule once via the AWS console or `aws events put-events` and confirm the cron branch executes correctly in CloudWatch logs — this can't be verified locally since it depends on the real EventBridge invocation shape.
7. Smoke-test the new platform-admin routes against the real sandbox JWT claims specifically, not just the local mock — per this repo's own documented history of `cognito:groups` claim-shape bugs that only surface once deployed.

## Implementation notes (2026-09-24)

Real deviations found while building:

1. **No `[submissionId]` detail route was built.** The original sketch above called for a dynamic detail page mirroring the `accounts/[accountId]` pattern. Building it revealed a simpler, more consistent option: `DocumentList.tsx`'s existing "View" action just opens a presigned URL in a new tab rather than navigating to a detail page — the admin queue (`dashboard/platform-admin/payments/page.tsx`) follows that same pattern instead (`FiEye`/`FiCheck`/`FiX` icon actions on each row, a small reject-reason modal). This avoids a `generateStaticParams` split entirely for this feature.
2. **`AccountRepository.setPlan()` needed a real fix, not just a coordination note.** It originally used `PutCommand` (full item overwrite) — once `subscriptionStatus`/trial/period fields exist on the same row, the platform-admin manual plan-toggle calling `setPlan()` would have silently wiped them on every use. Rewritten to merge via `UpdateCommand` (see `api/src/repositories/accountRepository.ts`'s `patchAccountPlan` helper, shared by every lifecycle method).
3. **Promo code duration needed per-account tracking, not just a code-level check.** `durationPeriods` is an allowance per account, not global — `resolvePromoForAccount()` (`api/src/lib/pricing.ts`) checks whether the requesting account has already started using a given code (via `Account.promoCode`/`promoPeriodsRemaining`) versus a first-time use, since a code's own validity alone can't tell those apart.
4. **A `GET /api/platform-admin/payment-submissions/{id}/view-url` route was missing from the original route table** and was added during implementation — the admin queue can't function without a way to actually view the uploaded proof (mirrors `DocumentHandler.getViewUrl`'s presigned-URL pattern exactly).
5. **`infra/modules/lambda/` was confirmed dead** (unreferenced by any `module` block in `infra/main.tf`) and deleted as part of this work — the real Lambda lives directly in `infra/modules/api/main.tf`, which is where the new `cron.tf` was added.
6. **Verification status**: `tsc --noEmit` clean in both `api/` and `lynxbox-ph/`, `next build` succeeds (all new routes generate correctly, no `generateStaticParams` issues), `terraform validate` passes. **Not deployed** — the cron job, in particular, cannot be verified end-to-end until `deploy-infra.ps1` applies the new EventBridge rule; local testing is limited to the `npm run cron:daily` script calling the handler directly.
7. **Known limitation: a manually-entered promo code and an active auto-apply promo can't be offered on the payment form at the same time.** `PaymentSubmissionForm.tsx`'s "Promo code (optional)" input is only rendered when there's no currently-active auto-apply code (`!autoPromoCode`) — if one is live, it takes over that spot in the UI and the manual-entry field disappears entirely. A non-auto-apply code still works perfectly well on its own (customer types it in, it validates and applies exactly like any other code) — this only matters if you want a sitewide auto-apply promo and a separate, targeted manually-entered code to both be usable in the same window. Revisit if that scenario actually comes up; not built now.

## Post-launch additions (2026-09-24, same day, extended session)

Real gaps found and closed after the initial implementation above, mostly from actually clicking through the flows:

8. **Maya (PayMaya) added as a third payment method**, alongside GCash and Bank Transfer — `PaymentMethod` is now `'gcash' | 'maya' | 'bank_transfer'` in both `api/src/models/paymentSubmission.ts` and the frontend types, with a shared `PAYMENT_METHOD_LABELS` map (`features/billing/types.ts`) so the admin queue and billing history render the label consistently instead of duplicating a ternary.
9. **Promo eligibility is now genuinely account-aware end-to-end, including the preview.** `resolvePromoForAccount()` (`api/src/lib/pricing.ts`) now also enforces **new-customers-only**: an account with any prior verified payment (`Account.lastVerifiedPaymentSubmissionId` set) can't *start* a promo relationship it wasn't already in, though it can still finish out a multi-period promo it's already using. Because this needs the real caller's account, the promo-preview endpoint (`GET /.../promo-codes/validate`) moved from `/api/public/*` (which never has an authenticated caller) to `/api/billing/*` — it used to just check the code's own validity and could show a discount that would silently not apply once actually submitted. `PaymentSubmissionForm.tsx` was refactored so both the auto-apply code and a manually-typed one flow through this same authoritative check (re-validated whenever plan/cycle changes too), rather than the auto-apply path trusting the raw public lookup.
10. **Promo codes gained real editing, not just create/deactivate.** New `PUT /api/platform-admin/promo-codes/{code}` + `PromoCodeManager.tsx` "Edit" action — can change discount, duration, cap, dates, auto-apply, and reactivate a deactivated code (code itself stays fixed, it's the natural key). Editing an optional field to blank sends `null` (not omitted `undefined`, which `JSON.stringify` drops silently) — `PromoCodeRepository.update()` now distinguishes `undefined` ("leave alone," the existing repo-wide convention) from explicit `null` ("remove this attribute").
11. **Promo codes can now be scheduled with a `startsAt` date**, not just an expiry — checked everywhere eligibility is evaluated (`isPromoApplicable`, `isPromoApplicableToPlan`, `findActiveAutoApply`). The admin table's status badge now distinguishes **Scheduled** (future `startsAt`) from Active/Inactive/Expired, so a future-dated code doesn't misleadingly show as already live. The "only one active auto-apply promo at a time" guard (added in the original build) was upgraded from a flat true/false check to actual date-**window overlap**, so a future promo can be pre-created without being blocked by a current one that will have expired by the time the new one starts.
12. **A promo's discount duration is now shown to the customer, not just tracked internally.** `durationPeriods` reads as "First month only" / "First N months" (or "year"/"years" on the annual cycle) via a shared `getPromoDurationLabel()` (`features/billing/pricingMath.ts`), shown on both the pricing table and the payment form — without this, a discounted price could look like the ongoing price rather than a limited-time one. The promo *code name* itself was removed from the pricing table display (kept on the payment form, where the customer already knows what they typed) per product decision.
13. **A monthly/annual toggle was added to `PricingComparisonTable`** (not part of the original build) — prices/periods are now derived live from `PLAN_PRICING` per the selected cycle rather than hardcoded strings, and the selected cycle flows through to every CTA's `?cycle=` link and the billing page's trial-start/switch-plan/payment-form actions.
14. **Self-serve "Downgrade to Free" was added** (`POST /api/billing/downgrade-to-free`) — previously the only paths to Free were letting a paid period lapse (which goes through the punitive `past_due` state first) or a platform-admin manual override. This is immediate and voluntary, reuses the same `revertAccountToFree()` the cron uses (same reconciliation: documents untouched, excess listings unlisted not deleted), just with different email copy (`reason: 'voluntary'` vs `'lapsed'`) and a confirmation dialog on the billing page.
15. **A lapsed trial can now be re-granted, not just extended.** `AccountRepository.extendTrial()`/the `extend-trial` endpoint originally only worked while `subscriptionStatus === 'trialing'` — once a trial lapses and reverts to Free, there was no way back (the customer's own start-trial is permanently blocked by `hasUsedTrial`, which never resets). Both now accept an optional `plan`: while trialing, omitting it just pushes the date (unchanged behavior); on any other status, `plan` is required and re-establishes `subscriptionStatus: 'trialing'` on that plan from scratch, deliberately bypassing `hasUsedTrial` as an explicit admin override. `AccountDetailClient.tsx` shows the matching UI for each case.
16. **Role-gating for billing actions.** New `canManageBilling` on the frontend `AccountContext` (mirrors the backend's owner-only `canManageBilling(actor)`). Non-owners see the exact same Start Trial/Switch Plan/Downgrade buttons, just disabled with a tooltip ("Only the account owner can manage billing") rather than hidden entirely — a deliberate departure from this repo's usual "hide disallowed actions" convention, per explicit product decision. The Billing nav link and page stay visible to every role (read-only for non-owners), matching how tenant/invoice/document lists already work rather than the Team page's fully-hidden treatment.
17. **Pricing pages are now auth-aware.** Previously every tier's CTA linked to signup regardless of login state. `PricingCtaButton.tsx` now checks the actual session: signed out still goes to signup; signed in skips straight to `/dashboard/billing` (no dead-end signup form for an existing user), shows "Current Plan" (disabled) on the account's actual tier, and "Switch Plan"/"Downgrade" elsewhere.
18. **Platform-admin visibility improvements**: the payment-verification queue shows the account owner's email (via `getCognitoUserEmail`, same best-effort pattern as elsewhere) instead of a raw account GUID; the platform-admin summary table (`dashboard/platform-admin/page.tsx`) now shows each account's plan (colored badge) and, while trialing, the trial end date, plus a Past Due badge — both `getSummary()` and `getAccountDetail()` now fetch `AccountRepository.getPlan()` alongside their existing per-account lookups.
19. **`PaymentReceivingDetails.tsx` was added** to actually tell the customer where to send money (previously missing entirely — the form asked for a reference number and proof with no receiving account shown anywhere). Shows a QR code for GCash/Maya (or a "QR code coming soon" placeholder) plus copyable account name/number, text-only for Bank Transfer. **Configured with placeholder values in `features/billing/paymentDetails.ts` — real account names, GCash/Maya numbers, bank details, and QR image files (dropped into `lynxbox-ph/public/payment-qr/`) still need to be filled in before this can go live**, since customers would otherwise see literal strings like `REPLACE_WITH_GCASH_NUMBER`.
20. **Unrelated pre-existing issues found and fixed while testing this feature, not part of the payments design itself but worth recording here:**
    - `lynxbox-ph/src/components/providers.tsx`'s `ChakraProvider` never registered a `primary` color palette, despite `colorScheme="primary"` being used throughout the app (including this feature's own new buttons) — resolved to an unstyled, invisible-but-clickable button (transparent background, since the underlying CSS var was never defined). Fixed by adding a real `primary` scale via `extendTheme`, anchored on `#0e2949` (this app's established brand navy, already used as a literal hex value in email templates and marketing pages).
    - `DashboardSidebar.tsx`'s `isActive()` used a plain `pathname.startsWith(href)`, which highlighted a parent nav item (e.g. "Platform Admin") simultaneously with a more specific child route (e.g. "Payment Verification") whenever the child's path is nested under the parent's — only surfaced once this feature added `dashboard/platform-admin/payments` and `.../promo-codes` as siblings-with-their-own-nav-items under the pre-existing `dashboard/platform-admin`. Fixed to pick the most-specific (longest) matching href among all nav items.
    - `next.config.js` applied `output: 'export'` unconditionally, including to `next dev` — meaning any dynamic route (not just this feature's) would error on a hard refresh or direct URL paste, since `next dev` enforced the same "every param must be in `generateStaticParams()`" constraint as the real static export, and every dynamic route here only ever registers a placeholder param. Fixed to only apply `output: 'export'` when `NODE_ENV === 'production'` (i.e. the real `next build`), leaving `next dev` free to render any param on demand; `next build` remains the authoritative static-export correctness check either way.
    - The signup page's leftover debug panel (raw env vars dumped to the page, plus a dead `checkAuthStatus` effect) was removed.
    - Added an explicit "No credit card required" line to the homepage, `/pricing`, and the signup page (dynamic: names the specific plan/trial when arriving via a plan-specific link), and confirmed the billing page's trial-start prompt already said the equivalent ("No payment required to start...").
21. **Early renewals now stack instead of resetting the period, and a reminder email was added so customers actually know to use it.** Originally, `AccountRepository.applyVerifiedPayment` always set `currentPeriodStart = now` / `currentPeriodEnd = now + periodDays` on every approval, regardless of how much time was left on the current period — so a customer who paid a few days early would have those unused days silently discarded, not credited. Fixed in `PaymentVerificationHandler.approve()`: it now computes `isStackableRenewal` (same plan, same billing cycle, `subscriptionStatus === 'active'`, and `currentPeriodEnd` still in the future) and, when true, passes that `currentPeriodEnd` as `stackFrom` so the new period extends from there instead of from `now`. A plan/cycle change, a first payment out of trial, or a renewal submitted after the account already lapsed all still reset from `now` — no proration for those, unchanged from the original design; this only protects a genuine same-plan early renewal from losing paid time. Paired with a new `sendRenewalDueSoonEmail` (mirrors `sendTrialEndingSoonEmail`) sent by the daily cron `RENEWAL_REMINDER_DAYS_BEFORE = 5` days before `currentPeriodEnd` for any `active` account — without this, nothing would have told customers they *could* pay early, and the only prior heads-up was the past-due email sent after the period had already lapsed. Idempotency guard is `Account.renewalReminderSentAt`, cleared on every new period (inside `applyVerifiedPayment`) so it fires once per period rather than once ever.
    - **Confirmed as already-correct, no change needed**: the monthly invoice-count limit (`PLAN_LIMITS[plan].maxInvoicesPerMonth`, checked in `InvoiceHandler.createInvoice`) is tracked per `accountId` + calendar month, independent of plan — so an account that upgrades mid-month to escape a hit invoice cap is unblocked on its very next invoice-creation call, since the same month's usage counter is simply compared against the new (higher) plan's limit. No proration or immediate-effect logic needed to be added for this case; it was a property of the existing design once traced through.
22. **Maya hidden from the payment method picker for now** — `PaymentSubmissionForm.tsx`'s radio group only offers GCash and Bank Transfer (the `<Radio value="maya">` line is commented out, not deleted — a one-line revert brings it back). `PaymentMethod` itself, `PAYMENT_METHOD_LABELS`, and the backend's acceptance of `'maya'` submissions are all untouched, so existing/historical Maya submissions still display correctly everywhere; this only affects what a *new* submission can choose.
23. **`PaymentReceivingDetails.tsx`'s QR display was generalized and enlarged.** It was originally gated to e-wallets only (`isEwallet = method === 'gcash' || method === 'maya'`); Bank Transfer can now also show a QR (many PH banks support QR Ph), so the `qrImage`-or-"coming soon"-placeholder branch is no longer conditional on payment method — it renders for whichever method has one configured, bank transfer included. Also bumped from 120px to 240px (customers reported the original size was too small to reliably scan) and switched the layout from a fixed side-by-side `HStack` to a `Stack` that goes vertical on narrow screens, so the bigger QR doesn't crowd the account-details text on mobile.
24. **Real bug: the monthly invoice-usage counter under-reported for every pre-existing invoice**, confirmed by direct inspection of the sandbox DynamoDB table (`AccountRepository.incrementMonthlyInvoiceCount`, added when Pricing-Strategy-Plan.md's usage tracking shipped) — it's a fire-and-forget counter incremented only inside `InvoiceHandler.createInvoice`, so it only ever reflects invoices created *after* that code actually reached the deployed Lambda (per this repo's standing "Lambda code deploys are separate from `terraform apply`" gotcha), never invoices that already existed. Root-caused by a read-only diagnostic scan (zero `USAGE#` rows existed at all despite 52 real invoices from before that deploy), then fixed with a one-time `api/src/scripts/backfillInvoiceUsageCounters.ts` (`npm run usage:backfill` in `api/`) that derives the correct per-account-per-month counts straight from real `Invoice.createdAt` timestamps and writes them via `PutCommand` (safe to re-run — it sets the counter to the derived value, doesn't add to it). Not a recurring job; rerun manually if this class of gap is ever suspected again (e.g. after another feature's code lags its own deploy).
25. **Dashboard cleanup**: removed the "Total Revenue" and "Occupancy Rate" stat cards from `dashboard/page.tsx` — both were always hardcoded to `$0`/`0%`, no real data source was ever wired up, and they weren't part of this feature's own usage-stats row. The "Upgrade Now" banner (added earlier as part of this plan) was moved from the very bottom of the page, below Recent Activity, to directly under the stats/usage rows and above Quick Actions — it was easy to miss at the bottom; this puts it above the fold on a normal viewport.

## Future considerations (not built, noted for later)

- **Proactive billing (a real "invoice" issued before payment, not just payment-attempt records).** Today the model is pay-first: `PaymentSubmission` rows only ever exist once a customer chooses to submit proof — nothing represents "₱1,499 is due for the period starting Oct 1" ahead of time. A future iteration could have the daily cron generate a discrete bill/invoice record (amount, plan, period, due date, status unpaid/paid/overdue) ahead of `currentPeriodEnd`, with `PaymentSubmission` settling against that specific invoice instead of the customer freely re-specifying plan/cycle/amount each time. Deliberately not built now — the existing Payment History table (driven by `PaymentSubmission`) already covers "keep track of payments" well enough for a manual-verification flow at this scale; revisit if/when a real payment gateway (card automation) is added, since that's the point where a bill needs to exist independently of a specific payment attempt anyway.

- **Plan upgrade/downgrade never touches an existing listing's `Property.expiresAt`** (docs/Pricing-Strategy-Plan.md's listing-visibility-duration limit) — confirmed by checking every plan-change path (`PaymentVerificationHandler.approve()`, the platform-admin manual plan toggle, and this doc's past-due-14-days-revert-to-free cron): all three only change the account's `plan`/`reconcilePropertyListingsForPlan()`'s excess-listing unlisting, never any existing property's `expiresAt`. So an **upgrade doesn't retroactively extend** an already-created listing's shorter window (it keeps the old plan's expiry until its next manual renew), and a **downgrade doesn't retroactively shorten** one either (a listing created under a higher plan keeps its longer window even after downgrading, until it's next renewed). It's forward-only in both directions — a plan change only affects the *next* create/renew, never what's already live. Left as-is for now (deliberate, not an oversight going forward) — revisit if this asymmetry turns out to matter in practice (e.g. someone downgrading specifically to keep enjoying a longer window they no longer pay for).
