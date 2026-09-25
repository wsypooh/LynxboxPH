# LynxboxPH Pricing Strategy

**Status:** Implemented locally (2026-09-23), `tsc --noEmit` passes — **not yet deployed**. Sections 1–5 of the Implementation Plan below are built, plus the surviving parts of section 6 (Free-tier signup needs no code, and the platform-admin manual plan-toggle endpoint). The "Request Upgrade" flow described lower in section 6 was correctly **not** built — it's superseded by the Payments and Subscription plan. See "Implementation notes" at the end of this doc for exact deviations found while building, and `infra/scripts/deploy-lambda.ps1`/`deploy-infra.ps1` (new route) before this reaches any real environment.

## Context

LynxboxPH serves small-to-medium commercial property owners (offices, warehouses, small commercial buildings) who can't afford a dedicated marketing or invoicing team. Per `docs/Business Plan_ ListSpace PH.md`, the product's original pitch was "helping small commercial landlords go digital" — and the codebase confirms this is genuinely a **two-pillar product**, not one:

1. **Marketing pillar — `Property` listings** (`api/src/models/property.ts`): a standalone, publicly-browsable listing entity (title, price, location, features, images, contact info) with its own public API (`/api/public/properties`), independent of any Building/Tenant record. This is how an owner advertises a vacant space to find new tenants. Confirmed shipped ("✅ Core Complete... Approved for Production" — `docs/Property-Filtering-Implementation-Plan.md`).
2. **Management pillar — `Building` → `Tenant` → `Invoice`/Ledger** (`api/src/models/building.ts`, ledger/invoicing docs): the back-office system for running the books on spaces already rented out — VAT/EWT auto-calc, FIFO ledger with penalty-interest automation, PDF Statements of Account, documents, RBAC. Confirmed shipped and "fully implemented and confirmed working in sandbox" per `docs/Ledger-Plan.md` (2026-09-21) and `docs/Documents-Feature-Plan.md`.

No usage caps exist anywhere in the code today — `resolveActor()` already gives every request an `accountId`, which is the natural place to hang a plan/tier field, but nothing enforces limits yet. This strategy defines the tiers; wiring up enforcement is separate follow-on engineering work (noted at the end).

**Competitive landscape** (fetched live):
- **Collo.ph**: ₱5,000+/month, custom quote only, no free tier. Full-service (mobile apps, maintenance tracking, built-in GCash/Maya collection, BIR-ready reports). Targets 1–200+ unit portfolios.
- **RentFlow.ph**: Free (3 units, beta) → Pro ₱499/mo (unlimited units, reports, BIR receipts "coming soon") → Business ₱1,499/mo (multi-user, API "coming soon").

Lynxbox's edge: VAT+EWT compliance and FIFO/penalty-interest ledger automation are **already live**, not "coming soon" — and Lynxbox is the only one of the three that bundles vacancy marketing *and* invoicing in one tool. Pricing below is positioned between RentFlow (cheaper, less automation) and Collo (pricier, custom-quote, sales-call required), and undercuts Collo's entry price at every self-serve tier.

**Metering approach**: tiers are **not** gated on Building/Tenant/management complexity — invoices and documents are what create value, not headcount of buildings. So:
- **Primary ceiling**: number of active `Property` listings (the marketing job — a landlord advertising vacant spaces is the clearest "how big is this customer" signal and the cheapest thing to meter).
- **Soft fair-use cap**: invoices generated per month. This also *indirectly* caps meaningful portfolio size without capping Buildings/Tenants directly — a real portfolio must invoice every occupied tenant monthly, so tenant/building count that matters will naturally push invoice volume past the free/Starter caps and prompt an upgrade.
- Document storage is included as a per-tier allowance (not a hard axis) since it's a real infra cost and a value driver.
- Team seats (RBAC roles) are a tier lever — RBAC/multi-account membership is deployed and tested, so seat-gated tiers are safe to sell now.

---

## Recommended Tiers

| | **Free Forever** | **Starter** | **Growth** *(Most Popular)* | **Business** |
|---|---|---|---|---|
| **Price/month** | ₱0 | ₱699 | ₱1,499 | ₱2,990 |
| **Price/year** (2 mo. free) | — | ₱6,990 | ₱14,990 | ₱29,990 |
| **Active property listings** | 2 | 5 | 15 | Unlimited |
| **Photos per listing** | 3 | 10 | 10 | 10 |
| **Listing visibility duration** | 7 days (manual renew) | 30 days | 60 days | No expiry |
| **Public search placement** | Standard | Standard | Priority | Top/Featured |
| **Invoices/month** (soft fair-use) | 10 | 50 | 200 | Unlimited |
| **Team seats** (owner/manager/staff/viewer) | 1 (owner only) | 3 | 10 | Unlimited |
| **Document storage** | 250MB | 1GB | 5GB | Unlimited (fair use) |
| **Ledger (FIFO + penalty automation)** | ✅ | ✅ | ✅ | ✅ |
| **VAT/EWT auto-calc, PDF Statement of Account** | ✅ (Lynxbox branded) | ✅ (unbranded) | ✅ (unbranded + custom logo watermark) | ✅ (full white-label) |
| **CSV import (tenants, ledger history)** | ✅ | ✅ | ✅ | ✅ |
| **Batch ZIP invoice download** | – | ✅ | ✅ | ✅ |
| **Support** | Best-effort email | Email | Priority email/chat | Priority + dedicated onboarding |

**Why these numbers:** Starter roughly matches RentFlow's Pro price point but justified higher (₱699 vs ₱499) by compliance automation RentFlow doesn't have live yet. Growth sits at under a third of Collo's entry price while being self-serve (no sales call). Business undercuts Collo's ₱5,000+ floor by ~40% and stays in reach of "small-medium," not enterprise, per the target market.

**Anti-abuse handling for the invoice soft cap:** don't hard-block mid-cycle — show an in-app banner at 80%/100% of the monthly cap prompting upgrade, and only enforce a hard stop the following billing cycle if still over. This avoids cutting off someone's rent-collection workflow mid-month, which would be a bad first experience with a paid product.

---

## Upsell / future-feature ideas (from the roadmap docs)

These are already-planned-but-unbuilt features (`docs/Rental-Invoicing-Plan.md`, `docs/Image-Watermark-Feature.md`, `docs/Property-Filtering-Implementation-Plan.md` "Future Scope" sections) that make good **Growth/Business-exclusive** hooks once built, since they reinforce recurring upgrade value beyond raw limits:
- Contract renewal reminder emails, automated yearly rent increase
- Electric bill computation tool — landlord enters the total peso amount and total kWh usage from their Meralco/electric co. bill for the building, and it auto-computes the per-kWh `currentElectricityRate` to update on the Building, instead of them doing that division by hand every month
- Custom logo watermarking on listing photos (Growth+)
- API access, portfolio-wide reporting (Business)
- **Invoice PDF custom logo / full white-label (Growth: custom logo, Business: full white-label)** — the comparison table's "PDF branding" row has promised this since the pricing tiers were first written, but only the binary branded/unbranded half is implemented (see "Implementation notes" #11 below: `PdfService.generateInvoicePdf`'s `branded` flag just prints/omits a "Powered by LynxboxPH" footer line). Actually building the logo/white-label tiers needs, at minimum:
  - A `logoUrl` (and, for Business's "full white-label," a `brandColor`) field on `Building` or `Account` — doesn't exist today.
  - An upload flow to get that logo into S3, e.g. mirroring the Documents feature's direct-to-S3 presigned-URL pattern (`docs/Documents-Feature-Plan.md`) rather than base64-embedding it in a request body.
  - `PdfService.generateInvoicePdf` fetching the image from S3 and drawing it in the header (pdfkit supports `doc.image()` from a Buffer), replacing/supplementing the current text-only header built in `pdf.ts`.
  - For Business's "full white-label": also swap the hardcoded `primary = '#0e2949'` color used throughout `pdf.ts` for the account's `brandColor`, so no LynxboxPH visual identity remains at all — this is the actual difference from Growth's "custom logo" tier, not a separate feature.
  - Gate which of these apply via `PLAN_LIMITS`-style plan checks, same pattern as `branded` today (`plan === 'growth' || plan === 'business'` for the logo, `plan === 'business'` for the brand color).

**À la carte add-on (independent of subscription tier):** the tiers above already differentiate photos/duration/search placement per plan, but the original business plan's one-time "featured/boosted listing" idea (₱300–500 for extended visibility) can still work *on top of* any tier as a temporary bump above your plan's normal placement/duration — e.g. a Starter account paying once to get `featured` placement or a longer `expiresAt` on one specific listing. Same `expiresAt`/`searchPlacement` fields from the implementation plan handle this already; a boost is just a temporary override of those two fields with its own end date, not new infrastructure.

**Out of scope:** `docs/Business Address Service.md` (the Bacolod virtual-mailbox/registered-address service) is a separate physical business line under the same brand, targeting tenants/SMEs rather than landlords — not folded into this SaaS pricing. Worth a future look as a cross-sell to Lynxbox landlords' *own* tenants, but that's a distinct initiative.

---

## Implementation Plan

Billing/payment processor integration (PayMongo/Xendit, GCash/Maya/card charging) is **explicitly out of scope here** — separate plan later. This covers everything needed to define, store, and enforce the tiers with `plan` set manually for now (by you, as platform-admin) ahead of real billing.

### 1. New `Account` entity — where the plan actually lives

There's no existing per-account record today — a solo account is implicit (`accountId === sub`, per `resolveActor()` in `api/src/lib/auth.ts`), and `MEMBER#` rows only exist once a second person is invited. Add a new `EntityType.ACCOUNT` (registered in `api/src/lib/dynamodb.ts`, the only place entity types are registered) with **two SK variants under the same PK**, mirroring the existing `ChargeEntry`/`PaymentEntry` convention in `api/src/models/ledgerEntry.ts` (both `EntityType.LEDGER_ENTRY`, differentiated by `GSI1SK` prefix `CHARGE#`/`PAYMENT#`):

- `PK: ACCOUNT#<accountId>`, `SK: PLAN#<accountId>` — `{ plan: 'free'|'starter'|'growth'|'business', planUpdatedAt }`
- `PK: ACCOUNT#<accountId>`, `SK: USAGE#<accountId>#<YYYY-MM>` — `{ invoiceCount: number }`, one row per calendar month

New `AccountRepository` (static-method class, same shape as every other repo): `getPlan(accountId)` (defaults to `'free'` when no row exists — same zero-migration lazy-default pattern RBAC already uses for solo accounts), `setPlan(accountId, plan)`, `getMonthlyInvoiceCount(accountId, yyyyMm)`, `incrementMonthlyInvoiceCount(accountId, yyyyMm)` (single `UpdateCommand` with `ADD invoiceCount :1` — no transaction needed, matching this repo layer's existing no-transactions convention).

**Forward-compatibility note (for the follow-up Payments and Subscription plan, not yet implemented — see that plan when it's picked up):** `getPlan(accountId)` should return the **whole row object**, not a narrowed `{plan, planUpdatedAt}` shape. That later plan adds subscription-status/trial/billing-period fields to this same `PLAN#` row, and wants `resolveActor()` to read more fields off the same `Get` at zero extra cost rather than needing this fetch restructured.

Extend `resolveActor()` to fetch and attach `actor.plan` (one extra `Get`, consistent with the multiple per-request Get/Query calls already typical here) so every handler can read it without a separate lookup.

### 2. Hardcoded limits config

`api/src/lib/planLimits.ts` — a single object, same spirit as the `EntityType` enum:
```ts
export const PLAN_LIMITS: Record<Plan, {
  maxProperties: number; maxPhotosPerListing: number; listingDurationDays: number | null; searchPlacement: 'standard' | 'priority' | 'featured';
  maxInvoicesPerMonth: number; maxSeats: number; maxDocumentBytes: number;
}> = {
  free:     { maxProperties: 2,  maxPhotosPerListing: 3,  listingDurationDays: 7,    searchPlacement: 'standard', maxInvoicesPerMonth: 10,  maxSeats: 1, maxDocumentBytes: 250 * MB },
  starter:  { maxProperties: 5,  maxPhotosPerListing: 10, listingDurationDays: 30,   searchPlacement: 'standard', maxInvoicesPerMonth: 50,  maxSeats: 3, maxDocumentBytes: 1 * GB },
  growth:   { maxProperties: 15, maxPhotosPerListing: 10, listingDurationDays: 60,   searchPlacement: 'priority', maxInvoicesPerMonth: 200, maxSeats: 10, maxDocumentBytes: 5 * GB },
  business: { maxProperties: Infinity, maxPhotosPerListing: 10, listingDurationDays: null, searchPlacement: 'featured', maxInvoicesPerMonth: Infinity, maxSeats: Infinity, maxDocumentBytes: Infinity },
};
export const DOCUMENT_COUNT_ABUSE_GUARD = 500; // flat, plan-independent — see Implementation notes #12
```
(`listingDurationDays: null` = never expires.) No per-account override, no editable settings table — confirmed as unnecessary for now; revisit once there are actual customers asking for one-off deals.

### 3. Enforcement — each one reuses an existing repository method, no new query infrastructure

| Limit | Check added to | Reuses |
|---|---|---|
| Active property listings | `PropertyHandler.createProperty` | `PropertyRepository.listByOwner(accountId)` (already exists) — count rows where `!deletedAt`, compare to `PLAN_LIMITS[plan].maxProperties` |
| Photos per listing | `PropertyHandler.createProperty`/`updateProperty` | Plain array-length check: `data.images.length <= PLAN_LIMITS[plan].maxPhotosPerListing` — no new infrastructure |
| Listing visibility duration | `createProperty` (set), public listing read path (enforce) | New `expiresAt` field on `Property` (doesn't exist today), set at creation as `createdAt + listingDurationDays`. No cron/scheduled job needed — the public `/api/public/properties` query just filters `status === 'available' && (expiresAt === null || now < expiresAt)` in the existing JS-side post-fetch filtering, matching this repo's "aggregation/filtering happens in JS after the fetch" convention. Owner can manually "renew" (bump `expiresAt`) from their private listing view. |
| Public search placement | Public listing read path | New `searchPlacement` derived from the owner's current plan at read time (or denormalized onto the `Property` row at create/plan-change time) — sort results by placement rank (`featured` > `priority` > `standard`) then recency, in the same JS-side step as the expiry filter above. No new index needed at this scale. |
| Invoices/month | `InvoiceHandler.createInvoice` (and the rollover-to-next-month path, which also creates a new invoice) | New `AccountRepository.getMonthlyInvoiceCount` / `incrementMonthlyInvoiceCount` described above |
| Team seats | The member-invite handler | `MembershipRepository.listByAccount(accountId)` (already exists) — count non-removed members + 1 for the implicit owner, compare to `maxSeats` |
| Document storage | `DocumentHandler.createDocument` | `DocumentRepository.listByOwner(accountId)` (already exists) — sum `fileSize` (already tracked on every `Document` record) across non-deleted rows, compare to `maxDocumentBytes`. A flat, plan-independent `DOCUMENT_COUNT_ABUSE_GUARD` (500) also applies as a backstop against many-tiny-files abuse — see Implementation notes #12 |

Property-creation/update limits (listings, photos) and the seat/document limits return `ApiResponse.forbidden('Upgrade to add more...')`-style responses (existing convention), which the frontend renders as an upgrade prompt rather than a generic error. Listing duration and search placement aren't rejection-based — they just change what the public API returns/how it's sorted.

**Invoice soft-cap specifically**: per the fair-use policy above, don't hard-block the moment the count is hit — return a response the frontend renders as an 80%/100% warning banner, and only actually block new invoice creation once a full calendar month has passed still over the limit.

### 4. Downgrade / lapse behavior

Two different situations, handled differently:
- **Invoices/seats/documents** are point-in-time creation gates, not stored inventory — downgrading just lowers the ceiling for *new* creations going forward. Nothing needs to happen to existing data.
- **Property listings** are standing inventory, so downgrading below the new `maxProperties` needs an explicit decision: unlist the oldest-created excess listings first (flip `Property.status` to a new `'unlisted'` value — distinct from the existing `deletedAt` soft-delete, since the owner didn't ask to delete them, just lost the slot) rather than deleting anything. The owner can manually choose which stay listed if they re-upgrade before their next billing cycle.

  **Forward-compatibility note (for the follow-up Payments and Subscription plan, not yet implemented):** implement this unlisting logic as its own standalone function (e.g. `reconcilePropertyListingsForPlan(accountId, newPlan)`), not inlined into the admin plan-change route below — that later plan's daily cron job needs to call this exact same logic for its "14 days unpaid, auto-revert to Free" case.

### 5. Homepage pricing section — implemented as a comparison table

**As built** (superseding the original card-grid sketch below — see Implementation notes #9): `lynxbox-ph/src/app/page.tsx`'s `#pricing` section is a `PRICING_TIERS` data array (name/price/period/popular/rows) mapped into a single Chakra `Table`: one header column per tier (name, price, "Most Popular" badge on Growth) across the top, and one row per feature down the first column — `Active property listings`, `Photos per listing`, `Listing visibility duration`, `Public search placement`, `Invoices/month`, `Team seats`, `Document storage`, `Batch ZIP invoice download`, `PDF branding`, `Support` — in the exact same order as the "Recommended Tiers" table above, so the two are easy to compare at a glance. The three rows that are identical across every tier (Ledger, VAT/EWT + PDF Statement of Account, CSV import) are called out once in a line above the table instead of repeated in every column. A final table row holds each tier's "Get Started" CTA button. Wrapped in `overflowX="auto"` for mobile.

*Original sketch (superseded, kept for context):* a 4-card `SimpleGrid` with bullet lists per card, evolved from the pre-existing 3-card grid (Free/Professional/Enterprise, old ListSpace-PH numbers). The card version worked but didn't scan well side-by-side once every tier needed ~10 comparable line items — a table reusing the same row set fixed that.

CTA buttons all use the same `Button as={Link} href={route('/auth/signup')}` pattern for every tier (including Business) — new signups default to Free automatically (see below), and there's no separate "Contact Sales" custom-quote path since Business is a fixed self-serve price.

This is a pure frontend/marketing-copy change — no backend dependency, can ship independently of and before the enforcement work above.

*FYI, not part of this plan:* there's also a `lynxbox-ph/src/features/profile/components/SubscriptionManagement.tsx` + `ProfileService.getSubscriptionPlans()`/`updateSubscription()` — this looks like leftover scaffold (uses shadcn `@/components/ui/*` components, not Chakra UI like the rest of the app; returns fully mocked data; isn't imported by any actual page). It's dead code, not the live pricing display — no action needed on it now.

### 6. How a user actually subscribes, before real billing exists

**Status: partially superseded by the follow-up Payments and Subscription plan (not yet implemented).** That plan replaces the "Requesting a paid tier" step below entirely with a structured payment-submission + admin-verification flow (proof upload, a 30-day trial system, automatic past-due/lapse handling) — **do not build the "Request Upgrade" email-button flow described below**, it would just be thrown away. The other two steps are still correct and should be built exactly as scoped here: Free-tier signup needs no action, and the platform-admin-only manual plan-toggle endpoint is a permanent tool that survives into the later plan unchanged (it just gains a couple more fields to set once subscription-status/period tracking exists on the `Account` row).

Real self-serve checkout (redirect to a PayMongo/Xendit payment page, webhook flips the plan automatically) is the separate future billing plan. Until then, the flow needs to still work end-to-end without automated payment collection:

- **Signing up on Free**: no action needed — `AccountRepository.getPlan()` already defaults an account with no `PLAN#` row to `'free'`, so a brand-new signup is correctly on Free from day one with zero extra steps.
- ~~**Requesting a paid tier**: the homepage pricing cards' "Get Started"/"Upgrade" buttons for Starter/Growth/Business, plus a new in-app "Billing" section (e.g. `lynxbox-ph/src/app/dashboard/billing/page.tsx`, showing the current plan + the same tier grid), submit a **"Request Upgrade"** action rather than charging a card — it emails you (via the existing ZeptoMail integration already used for statements/invites) with the account's details and the requested plan.~~ **Superseded — skip this, see note above.** The homepage CTAs for Starter/Growth/Business should still be redesigned per section 5 below, but should just link to plain `/auth/signup` (same as Free) rather than wiring any request-upgrade action — the later plan adds `?plan=&cycle=` query params to those same links, a small follow-up change, not rework.
- **Activating the plan**: don't let account owners flip their own plan via a self-serve endpoint — with no payment gate behind it yet, that would let anyone grant themselves Business for free. Instead, make the `plan`-setting action a **platform-admin-only** endpoint (implemented as `PUT /api/platform-admin/accounts/{accountId}/plan`, guarded by `isPlatformAdmin`), surfaced as a simple control on the existing platform-admin dashboard (`docs/RBAC-Admin-Plan.md`'s `/dashboard/platform-admin` view — the account detail page now has a plan dropdown + Save button). You manually collect payment (bank transfer/GCash) outside the app for now, then flip the account's plan there.
- **Swapping in real billing later**: when the payment-processor plan lands, the admin-toggle endpoint doesn't go away — it's still useful for comps/manual overrides. (The "Request Upgrade" button never gets built in the first place per the note above, so there's nothing to swap out for it specifically.)

Per this repo's standing rule, **any new route needs all three registrations** — `api/serverless.yml`, `infra/modules/api/routes.tf` (with the JWT authorizer), and `api/local-server.ts` — or it'll 401 or 404 depending on which one gets missed.

## Verification

This is a business strategy, not a code change — "verification" here means validating the assumptions before committing:
- Cross-check the proposed free-tier limits (2 listings / 10 invoices) against any real sandbox/beta accounts' actual usage today, if any exist, to confirm the free tier is generous enough to be a real hook but tight enough to convert.
- Confirm the ₱ price points with a handful of target customers (small commercial landlords) before publishing, since this is a genuinely price-sensitive segment.

## Implementation notes (2026-09-23)

Real deviations found while building sections 1–5 (and the surviving parts of section 6):

1. **Search placement is derived at read time**, not denormalized onto the `Property` row — picked the first of the two options this doc originally offered, since it avoids staleness after a plan change with no extra write path. `PropertyHandler.sortByPlacement()` batches a `Get` per distinct owner in a result page.
2. **Placement sorting only affects the default (no explicit `sortBy`) browse order.** If the caller explicitly sorts by price/area/views, that's respected as-is rather than having paid placement override it — this distinction wasn't spelled out in the original plan but matters for a coherent search UX.
3. **The monthly invoice counter keys off the invoice's actual creation date, not its `billingMonth`.** The cap is about how much invoicing work an account is doing right now (advance-billing or backfilled invoices would otherwise skew it).
4. **The document count check lives in `DocumentHandler.createDocument`** (the actual persistence point) — not `getUploadUrl`, which only presigns an S3 URL and creates nothing yet.
5. **Listing renewal is a `renew: true` flag on the existing `PUT /api/properties/{id}`**, not a new dedicated sub-route — smaller diff, no extra 3-file route registration needed.
6. **Fixed a cross-doc inconsistency this plan's admin endpoint exposed**: `docs/RBAC-Admin-Plan.md` had attributed platform-admin's "first write action" solely to the future Payments and Subscription plan. Since this plan's plan-toggle endpoint actually ships first, that doc's decision #1 and its "Planned deviation" section were corrected to say so.
7. **Not built**: the 80%/100% invoice-quota warning banner UI. The backend enforcement (soft-cap, two-months-over hard block) is in place and the API response carries enough information to build it, but no frontend banner component was added in this pass.
8. **Not deployed.** `tsc --noEmit` passes locally; this needs `deploy-lambda.ps1` (new handler code) and `deploy-infra.ps1` (new `PUT /api/platform-admin/accounts/{accountId}/plan` route) before it's live anywhere real.
9. **Homepage pricing ended up as a comparison table, not the originally-sketched card grid** — see the "As built" note in section 5 above. Requested after the initial card-grid implementation because a 4-card layout with ~10 line items per card didn't scan well side-by-side; a table with feature rows in the first column and one column per tier does. The `PRICING_TIERS` data array drives both — same row labels/order as the "Recommended Tiers" table above, by design, so this doc and the live page stay easy to compare.
10. **`maxPhotosPerListing` changed from `Infinity` to `10` on all three paid tiers** (2026-09-24) — Starter/Growth/Business all originally shipped "Unlimited" photos per listing; capped uniformly at 10 across all paid tiers (Free stays at 3). No enforcement code changed — `PropertyHandler`'s existing `images.length > limits.maxPhotosPerListing` check and its "Upgrade for more" message already handle a finite paid-tier limit correctly, this was purely a `PLAN_LIMITS` config + marketing-copy change.
11. **"PDF branding" was comparison-table copy only until now — never implemented.** `PdfService.generateInvoicePdf` (`api/src/lib/pdf.ts`) took no plan/account input at all; every tier got an identical PDF. Fixed (2026-09-24) by adding a `branded: boolean = false` param that prints a small "Powered by LynxboxPH" footer line, and threading `actor.plan === 'free'` into it from all 4 call sites in `InvoiceHandler` (`sendInvoice`, `downloadPdf`, `downloadBatchPdfByIds`, `downloadBatchPdf`). Scoped narrowly to the binary branded/unbranded case the row actually needed — Growth's "+ custom logo" and Business's "full white-label" cells are still just copy, since there's no logo-upload feature (no `Building`/`Account` logo field) to hang that on yet.
12. **Document storage switched from a file-count cap to a real byte-size cap (2026-09-25).** The original `maxDocuments` (20/200/1000/Infinity file count) was a poor proxy — a landlord's real documents (lease PDF + government ID per tenant, sometimes a permit) are naturally numerous but individually small, so the Free tier's 20-file cap could be exhausted by ~10 tenants' worth of onboarding paperwork alone, well before the *advertised* 100MB was anywhere near used. Since `Document.fileSize` was already tracked on every record (just never summed), switching to real cumulative bytes was a small change, not new infrastructure: `DocumentHandler.createDocument` now sums `fileSize` across `DocumentRepository.listByOwner()` and compares to `PLAN_LIMITS[plan].maxDocumentBytes`; `BillingHandler.getUsage()` returns the same sum as `usage.documentBytes` instead of a raw count. A flat, plan-independent `DOCUMENT_COUNT_ABUSE_GUARD = 500` was added alongside it purely to block someone uploading thousands of near-zero-byte files to game a size-only cap — not a customer-facing/marketed number. Free's budget was also raised from the originally-advertised 100MB to **250MB** in the same pass, since S3 storage is negligible cost either way (~$0.002–0.006/month per free account) and 100MB left too little headroom over realistic usage; Starter (1GB) and Growth (5GB) were confirmed to already have comfortable headroom (~2–3x realistic usage) and left unchanged. `PlanLimits`/`UsageSummary` are hand-duplicated between `api/src/lib/planLimits.ts` and `lynxbox-ph/src/features/billing/types.ts` (no shared type), so both were updated, along with the dashboard's "Documents" stat card (`lynxbox-ph/src/app/dashboard/page.tsx`) to render via the existing `formatFileSize()` helper instead of a raw count, and the homepage/billing-page shared `PricingComparisonTable.tsx`'s "Document storage" row copy (dropped the "X files /" prefix entirely).
13. **Found and fixed a related pre-existing gap while doing this: `DocumentHandler.deleteDocument` never actually deleted the S3 object**, only soft-deleted the DynamoDB record — inconsistent with `PropertyHandler.deleteProperty`, which already cleans up its S3 images on delete. This meant a "deleted" document was correctly excluded from the byte-quota sum (which only reads non-deleted rows) but its real S3 storage cost never actually went away. Fixed by calling `s3Service.deleteObject(document.s3Key)` after the soft-delete, wrapped in try/catch so a leaked-object cleanup failure never blocks the user-facing delete.
