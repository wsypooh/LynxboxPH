# Tenant Ledger System

## Implementation Status — 2026-09-21

Fully implemented and confirmed working in sandbox, plus several additions beyond the original plan below — most driven by real issues found while walking through actual test scenarios (importing a historical balance, billing it, recording a payment, rolling to the next month).

**Delivered as planned:** `LedgerEntry` model (`ChargeEntry` / `PaymentEntry`), `LedgerRepository` FIFO payment engine, `LedgerHandler` routes, CSV import for historical balances, `LedgerView` on the tenant page, invoice creation reading `previousBalance` from the ledger and registering a `ChargeEntry` per invoice.

**Added beyond the original plan:**

1. **Void replaces delete for non-draft invoices.** Deleting is now restricted to `draft` only (`InvoiceHandler.deleteInvoice` returns 400 otherwise). Any other status uses `POST /api/invoices/{id}/void`, which keeps the invoice record and its number (audit trail, avoids invoice-number reuse since numbering is count-based) but excludes it from future `previousBalance` by soft-deleting its linked `ChargeEntry`.
2. **Per-tenant ledger reset** (`POST /api/tenants/{id}/ledger/reset` → `LedgerRepository.resetTenantLedger`) — soft-deletes every charge/payment for one tenant, to recover from a bad CSV import. Deliberately scoped to one tenant, not a global wipe; gated by a confirm dialog on the tenant page, separated from the "Record Payment" button to avoid accidental clicks.
3. **"As of" month override** on `GET /api/tenants/{id}/ledger` (`?asOf=YYYY-MM`) plus a UI month picker on `LedgerView` — lets penalty math be checked against a simulated month instead of always today's real date, since the live view otherwise always computes "months overdue" from wall-clock time, which doesn't wait for a manual test's simulated timeline.
4. **Two distinct payment views on invoices**, both computed server-side:
   - `ledgerPayments` — payments FIFO-applied specifically to *this invoice's own* charge entry (`LedgerRepository.listPaymentsForInvoice`). Shown in the invoice's Payments tab as "Applied from Tenant Ledger Payments." Since FIFO always settles the oldest charge first, this is usually empty except on whichever invoice is currently the oldest unpaid one.
   - `paymentsReceived` — every tenant-level payment received since the tenant's *previous* invoice was created, regardless of which charge it actually settled (`InvoiceHandler.getPaymentsReceivedSinceLastInvoice`). Computed once at invoice creation (immutable snapshot, same pattern as `previousBalanceHistory`), so it survives even if the charge it paid down later gets fully settled and drops out of `previousBalanceHistory`. Shown on the Statement of Account and printed PDF, positioned *before* Current Charges, with a note that it's "already applied to the balance below" — repositioned after real confusion in testing about double-counting against the totals.
5. **Manual penalty override on draft invoices** — the "Previous Balance Detail" table's Penalty column is editable via `InvoiceForm` while an invoice is still `draft` (Due/Paid columns kept here since it's an internal tool). Only affects what's billed on that specific invoice; does **not** change the ledger's own `pendingPenalty()` formula for future invoices — flagged directly in the UI as a caveat.
6. **"+ New Invoice" now carries forward meter readings.** Previously only "Roll Over" did this; a blank new invoice created from the tenant page always reset `electricity.previousReading`/`water.previousReading` to 0. Fixed by looking up the tenant's most recent invoice on page load and seeding those fields from it. **Real bug found and fixed (2026-09-28): that lookup didn't exclude void invoices.** `NewInvoicePage` picked whichever of the tenant's invoices had the highest `billingMonth` with no filter on `status` — if the most recent billing-month invoice happened to be void, its `presentReading` still got carried forward as the new invoice's `previousReading`. A void invoice is kept only for audit trail and excluded from balances everywhere else (see #1 above); it shouldn't be treated as the source of truth for a live meter reading either. Fixed by filtering to `status !== 'void'` before sorting.
7. **Simplified the customer-facing Previous Balance table** — dropped the Due/Paid columns (kept Outstanding/Penalty only) on the Statement of Account and PDF after they contributed to the double-counting confusion in #4; the internal `InvoiceForm` edit table keeps the full breakdown since that one is a business tool, not customer-facing.
8. **Real bug found and fixed (2026-09-27): `Building.penaltyRate` (`BuildingForm.tsx`'s "Penalty Rate (%)" field, defaults 5%) was never actually read by any penalty computation.** `LedgerRepository.pendingPenalty()` used a hardcoded module-level `PENALTY_RATE = 0.05` constant instead — an owner could set a custom rate on their Building and it would silently have zero effect anywhere: not on the ledger view, not on invoice `previousBalance`, not on FIFO payment application. Reported as "I entered the penalty [rate] but it isn't being considered — it just computes its own." Fixed by threading a `penaltyRate` parameter through `pendingPenalty()`, `getLedgerSummary()`, and `recordPaymentWithFIFO()` (default `DEFAULT_PENALTY_RATE = 0.05`, used only when a Building lookup somehow comes back empty), and having every call site (`LedgerHandler.getLedger`/`recordPayment`, `InvoiceHandler.createInvoice`/its rollover-to-next-month path) fetch `Building.penaltyRate` the same way `withholdingTaxRate`/`vatRate` already were and pass it in. **A second, related bug found in the same function while fixing this**: `recordPaymentWithFIFO` never checked `tenant.penaltyEnabled` at all — a tenant with penalties explicitly disabled still had `pendingPenalty()` computed and deducted penalty-before-principal on every payment; only the read-side (`getLedger`/`getLedgerSummary`) ever respected that flag. Fixed by threading `penaltyEnabled` through the same call. No data migration needed for either fix — penalty was never stored, only computed fresh on every read, so correcting the formula immediately corrects every future read with no backfill.
9. **Historical-balance CSV import can now carry an optional, frozen penalty amount (2026-09-27).** Recomputing simple interest from a charge's original `billingMonth` using *this system's* current rate doesn't necessarily match what the old system actually tracked as owed (different rate, different rules, or simply a number already agreed with the tenant) — entry #8 above made the rate at least correct, but still recomputed from scratch. New optional `penaltyAmount` column in `LedgerCsvUpload.tsx`'s template, stored as `ChargeEntry.importedPenalty`. When set, `pendingPenalty()` short-circuits to `max(0, importedPenalty - penaltyPaid)` instead of the formula — **frozen by design**, never recomputed/grown further, decreasing only as `penaltyPaid` increases from FIFO-applied payments (same mechanism a normal computed-penalty charge already uses). Left blank (the common case), a charge behaves exactly as before — formula-computed from the Building's `penaltyRate`. Chosen over the alternative (an imported baseline that keeps accruing more penalty going forward) for simplicity: no new "since" reference date needed, and it mirrors how `InvoiceForm.tsx`'s existing manual penalty override on draft invoices is also frozen/display-only rather than feeding back into future accrual.
10. **New `Tenant.paymentWaived` flag (2026-09-27) for tenants whose invoices — typically pure utility pass-throughs (electricity/guard/water) — the owner never actually collects payment for.** Without this, such an invoice's `ChargeEntry` would sit `principalOutstanding > 0` forever with no payment ever recorded against it, rolling forward into every future invoice's `previousBalance` and accruing penalty indefinitely on money that was never actually meant to be collected. Considered and rejected: (a) offsetting the invoice with a `discount` equal to the full charge — misrepresents what happened on the customer-facing statement/PDF as a price break, and pollutes discount reporting; (b) recording a fake payment — `PaymentMethod` (`'cash' | 'check' | 'gcash' | 'credit_card' | 'bank' | 'online_banking'`) is a closed set of real money-movement channels, and a synthetic "waived" payment would corrupt any future "amount collected by method" reporting with money that never moved. Instead: a normal per-tenant toggle (`TenantForm.tsx`, alongside `penaltyEnabled`/`vatEnabled`/`withholdingTaxEnabled` — available to every account owner, not platform-admin-gated, since it's mechanically no different from those existing tenant-level billing toggles and platform-admin's role here is deliberately read-only/cross-account oversight, not per-tenant data entry). `InvoiceHandler.createInvoice` passes `tenant.paymentWaived` into `LedgerRepository.createChargeEntry` as `waived`, which sets that charge's `principalOutstanding: 0` **at creation** (`principalAmount` still holds the real charge amount, for record-keeping) rather than the usual `principalOutstanding: principalAmount`. This reuses every existing mechanism with zero special-casing elsewhere: the `principalOutstanding > 0` filter already used everywhere (rollover's `previousBalanceHistory`, FIFO's `outstanding` list) naturally excludes it, and `pendingPenalty()`'s formula naturally evaluates to 0 when `principalOutstanding` is 0 — no new exclusion logic needed in either place. `ChargeEntry.waived` itself is stored purely for display (a "waived" badge in `LedgerView.tsx`, next to the source badge) so it doesn't look like a payment was silently collected with no record of one. Whole-invoice only, not per-line-item (electricity/guard/water can't be waived individually on the same invoice) — matches the actual reported need, and per-component waiving would need a materially bigger change (splitting one `ChargeEntry` per line item, which doesn't fit today's "one charge per invoice" ledger model at all). Also surfaced in two places a user would otherwise miss it entirely: an "Orange — Waived" badge in the tenant detail page's "Billing Defaults" summary card (shown only when true, same pattern as that card's conditional "Guard" line), and a `paymentWaived` column in `TenantCsvUpload.tsx`'s bulk import/export (same true/false parsing as the existing `penaltyEnabled` column, defaulting to `false` when blank — the correct default for an opt-in flag, unlike `penaltyEnabled` which defaults to `true`).
- **The customer-facing Statement of Account/PDF didn't know about any of this** — it's generated purely from the `Invoice`'s own stored fields, with no reference to `tenant.paymentWaived` or the linked `ChargeEntry.waived` at all, so a waived tenant was still being handed a bill showing a real "TOTAL DUE ₱X" figure, exactly like a normal invoice — undermining the entire point of marking them waived. Fixed by snapshotting a new `Invoice.waived: boolean` at creation (`InvoiceHandler.createInvoice` sets it from `tenant.paymentWaived`, same "copy at creation, don't join live" convention already used for `buildingName`/`contactInfo`/etc. on this record) and having both `StatementOfAccount.tsx` and the PDF (`pdf.ts`) replace the "TOTAL DUE" row's amount with a "Waived — No Payment Required" badge/label when it's set, hiding the Amount Paid/Balance Outstanding rows too since there's nothing to reconcile. **Deliberately scoped narrowly**: `totalDue`/`outstanding`/`status` on the `Invoice` record itself are untouched — this only changes what's *displayed*, not the underlying numbers or the invoice's status-transition logic (`outstanding <= 0 → 'paid'` elsewhere) — that's a separate, bigger question (would a waived invoice's `outstanding` also need to be forced to 0, and does that affect dashboard "needs attention" lists?) not addressed in this pass.
- **Turning on `paymentWaived` never affects an invoice that already exists — only ones created afterward.** Caused real confusion during testing: a tenant's existing September invoice still showed a real "TOTAL DUE" after `paymentWaived` was switched on, which looked like the feature wasn't working. It was actually working correctly — `waived` is snapshotted once, at creation, onto both that invoice's `ChargeEntry` and the `Invoice` itself (same as every other denormalized field on those two records), never re-derived live from the tenant's current setting. There's no way to retroactively re-stamp an already-existing invoice short of voiding and recreating it — not built, since it wasn't asked for.
11. **Real bug found and fixed (2026-09-28): editing a draft invoice's charges never kept its `ChargeEntry` in sync.** `InvoiceHandler.updateInvoice` recomputes the *Invoice's* own `currentChargesTotal`/`totalDue`/`outstanding` when electricity/water/guard/other-charges/discount are edited, but only ever called `InvoiceRepository.update()` — the linked `ChargeEntry.principalAmount`/`principalOutstanding` (set once at invoice creation by `LedgerRepository.createChargeEntry`) stayed frozen at the *original* billed amount. Since `principalOutstanding` is what drives both `pendingPenalty()` and next month's `previousBalance` (via `getLedgerSummary`), this wasn't just a cosmetic mismatch on the one edited invoice — the ledger kept charging/rolling forward the stale pre-edit amount indefinitely, until whoever noticed a discrepancy re-created the tenant's whole ledger by hand. Fixed by adding a sync step at the end of `updateInvoice`: when the recomputed `currentChargesTotal` differs from the invoice's previous value, look up the linked charge (new `LedgerRepository.findChargeByInvoiceId`, also used to de-duplicate `deleteChargeEntryByInvoiceId`'s own lookup) and `updateChargeEntry` it with the new `principalAmount`, recomputing `principalOutstanding` as `max(0, newAmount - alreadyApplied)` where `alreadyApplied = principalAmount - principalOutstanding` — this preserves whatever's already been paid down via FIFO rather than resetting it. Skipped when the charge is `waived` (`principalOutstanding` stays pinned at 0, per #10 above).
12. **Invoice-level "Record Payment" removed from the UI (2026-09-28) — tenant-level ledger recording is now the only path.** `InvoiceDetailClient.tsx`'s "Record Payment" button, its `PaymentModal` wiring, and `handlePayment` (which called `invoiceService.recordPayment` → `POST /api/invoices/{id}/payments` → `InvoiceRepository.recordPayment`, writing straight to `invoice.payments[]` outside the ledger entirely) were deleted outright — every payment now goes through `TenantDetailClient.tsx`'s `LedgerView`/`recordLedgerPayment` → FIFO ledger flow described above, matching this doc's "user's required order of operations" from the start (#3: "Record payments against the tenant," never against an invoice directly). The backend route/handler and `invoice.payments[]` field are left in place (nothing calls them from the UI any more, but removing them wasn't asked for) — the invoice detail page's "Payments" tab still displays any pre-existing `invoice.payments` entries (now permanently frozen, never growing) alongside `ledgerPayments`, so old directly-recorded history stays visible (see #4 above).
13. **Quick "Record Payment" row action added to the tenants list (2026-09-28)** so recording a payment no longer requires opening the tenant detail page first. `TenantList.tsx` gained a `canWrite`-gated icon action (`LuPhilippinePeso` — `react-icons/fi` has no currency glyph, same reason `MdReceipt` was already borrowed from a different icon set for the Invoices action) that opens the same `PaymentModal` used by `TenantDetailClient.tsx`, submitting through the identical `tenantService.recordLedgerPayment` → FIFO flow. The list itself carries no ledger data (`Tenant` has no balance field, and fetching every row's balance up front would mean an N+1 against `LedgerRepository` on a paginated list), so the balance is fetched lazily — one `tenantService.getLedger(tenantId)` call — only when a row's action is clicked, not for the whole page. `PaymentModal` gained optional `subtitle`/`balance`/`balanceLoading` props to display it (a badge + spinner-while-loading above the Amount field, plus the tenant's name in the modal header) without forcing every existing caller to pass them — `TenantDetailClient` still doesn't, since its own `LedgerView` already shows the balance persistently on that page. Deliberately **not** wired to `maxAmount` (no cap/auto-fill from the fetched balance): `recordPaymentWithFIFO` already tolerates a payment exceeding total outstanding (the excess is simply left unapplied in `appliedTo`), and `TenantDetailClient`'s own Record Payment button doesn't cap either — capping only in this new quick-entry path would make it stricter than the flow it's shortcutting, blocking a legitimate advance/overpayment. The action is **hidden** (not disabled) when `tenant.paymentWaived` is true, alongside the existing `canWrite` check. Caveat: `paymentWaived` is forward-only (see #10) — flipping it on doesn't retroactively zero out charges from invoices created before the flag was set, so a currently-waived tenant could in rare cases still be sitting on a real pre-existing balance; hiding this shortcut only removes the quick path for that edge case, the full Record Payment flow on the tenant detail page is untouched.
14. **Real bug found and fixed (2026-10-04): once payments moved to the tenant-level FIFO ledger (#12), the `Invoice` record's own `status`/`amountPaid`/`outstanding` stopped ever being updated.** `LedgerRepository.recordPaymentWithFIFO` only ever writes to `ChargeEntry`/`PaymentEntry` — nothing wires it back to the `Invoice` it's paying down. Since the old per-invoice `recordPayment()` (#12, no longer called from the UI) was the *only* code that ever set these fields after creation, every invoice paid off through the current (and only) real payment path stayed stuck at whatever workflow status it had before payment (`sent`/`printed`) forever — the status badge, the Invoices list's Paid/Outstanding columns, and the status filter (`Partial`/`Paid`) were all silently wrong for any invoice touched by a ledger payment, even while `LedgerView` on the tenant page showed the correct, live `ChargeEntry.principalOutstanding` the whole time. Found while reviewing why "Partial" looked unreachable in the Invoices page's status filter. Fixed with a new `InvoiceHandler.derivePaymentFields(invoice)`, which recomputes `outstanding = charge.principalOutstanding` and `amountPaid = totalDue - outstanding` from the invoice's own linked `ChargeEntry` (`LedgerRepository.findChargeByInvoiceId`, already existed), skipped entirely for `draft`/`void` invoices. This reduces cleanly to just the one linked charge, with no need to re-derive `previousBalance` separately: `recordPaymentWithFIFO` always settles strictly-older charges first, so by the time this invoice's own charge has absorbed any payment, everything feeding its `previousBalance` snapshot must already be fully settled — meaning the linked charge's own outstanding *is* the whole invoice's outstanding. Wired into both `listInvoices` (applied before the `?status=` filter, so filtering by Paid/Partial now matches reality) and `enrichInvoice` (covers `getInvoice`, and the responses from `updateInvoice`/`voidInvoice`/`sendInvoice`, plus the PDF). One side effect worth knowing: if the old, no-longer-UI-exposed `recordPayment` endpoint is ever called directly, its effect on `amountPaid`/`status` is now immediately overridden back to whatever the ledger says on the next read — intentional, since the ledger is meant to be the single source of truth project-wide and that endpoint never touches `ChargeEntry` at all.
15. **Real bug found and fixed (2026-10-03): nothing enforced one non-void invoice per tenant per billing month.** `InvoiceHandler.createInvoice` had no duplicate check at all — every create path (manual "+ New Invoice", the single-invoice "Roll Over" button, and the Invoices list's bulk "Rollover to Next Month") funneled through it with zero guard, so re-running a rollover against a tenant that already had a next-month invoice (e.g. clicking the bulk action twice, or re-selecting an overlapping set) silently created a second invoice for the same tenant+month. `InvoiceCsvUpload.tsx`'s own duplicate check (skip-if-matching-tenant+month) is frontend-only and only ever covered that one entry point. Fixed by having `createInvoice` query the tenant's existing invoices (`InvoiceRepository.listByTenant`, already excludes soft-deleted) and reject with a 409 if a non-void match exists — this protects every entry point at once, not just bulk rollover. The Invoices page's bulk rollover handler (`handleRolloverSelected`) now recognizes that specific rejection and reports it as "skipped (already rolled over)" rather than lumping it into "failed."
16. **Invoice CSV import gained an "update" mode, and a new "Enter Meter Readings" bulk grid, for filling in a rolled-over month's present readings without opening invoices one at a time (2026-10-03/04).** Previously `InvoiceCsvUpload.tsx` only ever created invoices and explicitly skipped any row matching an existing tenant+billingMonth as a duplicate — meaning the natural "export this month, fill in meter readings, re-upload" workflow silently did nothing, since every row in an exported file is by definition an already-existing invoice. Now a matching row updates that invoice through the normal `updateInvoice` endpoint instead of being skipped, but only when the match is still `draft` (anything else is left alone, matching `updateInvoice`'s own only-drafts-are-editable rule — see the `deleteInvoice`/void note elsewhere in this doc). Because `updateInvoice` doesn't derive `electricity.amount`/`water.amount` from readings the way `createInvoice` does, the importer now computes `amount = max(0, (present - previous) * rate)` client-side before sending an update, to avoid silently zeroing out the charge. The CSV export (`InvoiceList.tsx`) also gained `waterPresentReading`/`waterPreviousReading` columns (it previously only exported `waterAmount`), so the round-trip covers water too. Separately, a new "Enter Meter Readings" bulk action (`InvoiceBulkReadingsModal.tsx`) gives an in-browser grid alternative to the CSV round-trip — select draft invoices on the Invoices list, type present readings directly (Present/Previous/Rate/Amount columns, water shown only when at least one selected tenant has metered water), and only the rows actually filled in get saved, sequentially, through the same `updateInvoice` endpoint.
17. **Bulk Delete and bulk Void added to the Invoices list's Bulk Actions menu (2026-10-03)**, both gated on `canDestroy` (owner-only), mirroring the exact same per-row icon logic already in `InvoiceList.tsx` rather than introducing new rules: the selection is automatically filtered to `draft`-only for Delete and non-draft/non-void for Void, with the confirm dialog stating upfront how many selected invoices will be left untouched by that action.
18. **Real bug found and fixed (2026-10-04): `InvoiceForm.tsx`'s edit form silently wiped `electricity.mode` to `undefined` on every save.** Found while debugging why #16's new "Enter Meter Readings" grid excluded an invoice that clearly had real, populated metered readings. Root cause: the form's zod schema only ever defined `mode` on the `water` object, never on `electricity` — so every submission's `data.electricity` (whether from `updateInvoice` or `createInvoice`) silently omitted `mode` entirely, and since `updateInvoice` replaces the whole `electricity` object rather than merging fields (see the `updateInvoice` sync note elsewhere in this doc), any invoice ever edited through this form permanently lost its stored `mode` from that point on — even though `presentReading`/`previousReading`/`rate`/`amount` stayed correct and genuinely metered. `createInvoice` was unaffected by the same gap only by accident: it derives `electricityMode` from `tenant.electricityMode` server-side and never reads `body.electricity.mode` at all. Two-part fix: (a) #16's grid (and every other spot checking this field) should test `mode !== 'direct'` rather than `mode === 'metered'`, since electricity only has two modes and treating "not explicitly direct" as metered-eligible is both correct and tolerant of a missing value — `InvoiceCsvUpload.tsx` and `new/page.tsx`'s previous-reading lookup already did this correctly, the new grid just hadn't matched it yet; (b) the actual root cause — added `mode: z.enum(['metered', 'direct'])` to `InvoiceForm.tsx`'s schema, set from the selected tenant's `electricityMode` when a brand-new invoice's tenant is chosen (mirroring how `water.mode` already works), and falling back to the tenant's *current* `electricityMode` when editing an existing invoice whose stored value is missing — so re-saving an already-corrupted invoice through this form now heals it instead of re-wiping it.

**Infra fixes surfaced along the way (blocked sandbox testing, not ledger-specific):**
- This project deploys API Gateway via Terraform (`infra/modules/api/routes.tf`), not `api/serverless.yml` (local-dev only, drives `serverless-offline`/`local-server.ts`) — all 5 new ledger routes had to be added there before sandbox worked at all. See the callout at the top of `CLAUDE.md`.
- `api/local-server.ts` needs its own explicit `app.all(...)` registration per route for local dev — a third, separate route list from both of the above.
- Lambda `memory_size` was declared as a Terraform variable (`lambda_memory_size`) but never actually wired to the `aws_lambda_function.api` resource — dead code, silently defaulting to AWS's 128 MB. Fixed and bumped to 512 MB to reduce cold-start lag on sandbox.

**Known limitation, not yet resolved:** a manually-overridden penalty (#5) and the ledger's own FIFO accounting can drift apart if that invoice is later paid down through the tenant-level ledger payment flow — the total money collected is still tracked correctly, but the penalty/principal split recorded in the ledger's audit trail won't match what was actually billed on the invoice. Flagged to the user; no fix implemented yet, pending a decision on whether it's worth the added complexity.

---

## Context
The current system records payments directly on individual invoices (`invoice.payments[]`) and rolls forward unpaid balances into each new invoice as a lump `previousBalance`. This causes stale invoice statuses, a flat (age-ignorant) penalty rate, and double-counting risk if payments are recorded on old invoices after their balance was already rolled forward. The fix is a proper tenant ledger where charges and payments are first-class records, FIFO payment application is automatic, and age-based penalties (5% × monthsOverdue on remaining principal) are computed correctly.

**User's required order of operations:**
1. Import historical unpaid balances via CSV (before any new invoices)
2. Create new invoices going forward (these read `previousBalance` from the ledger)
3. Record payments against the tenant (FIFO applied automatically)

---

## CSV Import Format

This is what the user uploads first. Each row is one unpaid invoice from their old system.

```csv
tenantCode,billingMonth,amount,invoiceNumber,description
T-001,2024-01,15000.00,INV-2024-01-0001,January 2024 rent unpaid
T-001,2024-02,18500.00,INV-2024-02-0001,February 2024 rent and water
T-002,2024-06,25000.00,OLD-0042,June 2024 full month unpaid
T-003,2024-03,8000.50,,Partial balance from March
```

| Column | Required | Format | Notes |
|---|---|---|---|
| `tenantCode` | YES | e.g. `T-001` | Must match existing tenant |
| `billingMonth` | YES | `YYYY-MM` (or `MM/YYYY`, auto-normalized) | Determines age for penalty; cannot be future |
| `amount` | YES | Numeric, positive | Outstanding balance still owed (after any prior partial payments in old system) |
| `invoiceNumber` | no | Free text | Reference from old system only |
| `description` | no | Free text | Narrative note |

**Validation per row:** blank/unknown tenantCode → skip; unparseable/future billingMonth → skip; zero/negative amount → skip; same tenantCode+billingMonth appearing twice in the same file → warn + skip second.

**Since added (see "Added beyond the original plan" #9 above): an optional `penaltyAmount` column** — leave blank to compute penalty from the Building's rate as this table describes, or set it to freeze that row's penalty at an exact carried-over amount instead.

---

## Ledger Data Model

### New: `LedgerEntry` (two sub-types)

**DynamoDB keys** (reuses existing GSI1 — no infra changes):
- PK: `LEDGER_ENTRY#{id}`, SK: `LEDGER_ENTRY#{id}`
- GSI1PK: `LEDGER#{tenantId}`
- GSI1SK: `CHARGE#{billingMonth}#{id}` for charges; `PAYMENT#{date}#{id}` for payments
- The `CHARGE#` vs `PAYMENT#` prefix in GSI1SK enables type-filtered `begins_with` queries

**ChargeEntry fields:**
```typescript
entryType: 'charge'
tenantId, ownerId
billingMonth: string              // YYYY-MM — drives penalty age
principalAmount: number           // original, never changes
principalOutstanding: number      // decremented by payments
penaltyPaid: number               // total penalty collected; prevents double-billing
invoiceNumber?: string
invoiceId?: string                // set when source === 'invoice'
description: string
source: 'import' | 'invoice'
```

**PaymentEntry fields:**
```typescript
entryType: 'payment'
tenantId, ownerId
paymentDate: string               // YYYY-MM-DD
totalAmount: number
paymentMethod: PaymentMethod
note?: string
appliedTo: Array<{
  chargeEntryId: string
  penaltyApplied: number
  principalApplied: number
}>                                // full FIFO audit trail
```

### Penalty formula
```
pendingPenalty(entry, currentBillingMonth, penaltyRate) =
  max(0, entry.principalOutstanding × penaltyRate × monthsOverdue - entry.penaltyPaid)
```
- `penaltyRate` is the tenant's Building's own `penaltyRate` (`BuildingForm.tsx`'s "Penalty Rate (%)", defaults 5% for new Buildings) — **not** a global constant. `DEFAULT_PENALTY_RATE = 0.05` in `ledgerRepository.ts` only exists as a same-value fallback for the (should-never-happen) case a Building lookup comes back empty; see "Added beyond the original plan" #8 for the real bug this was fixed from (a hardcoded rate that ignored the Building's configured value entirely).
- `monthsOverdue = (currentYear - chargeYear) × 12 + (currentMonth - chargeMonth)`, min 0
- Simple interest on remaining principal — NOT compound
- `penaltyPaid` ensures penalty already collected is not re-billed next month

### FIFO payment application (in `LedgerRepository.recordPaymentWithFIFO`)
1. Load all ChargeEntries for tenant ordered by billingMonth ascending (oldest first)
2. Filter to `principalOutstanding > 0`
3. Walk with `remaining` counter:
   - `penaltyApplied = penaltyEnabled ? min(remaining, pendingPenalty(entry, currentBillingMonth, penaltyRate)) : 0`; remaining -= penaltyApplied
   - `principalApplied = min(remaining, entry.principalOutstanding)`; remaining -= principalApplied
   - Update `entry.principalOutstanding -= principalApplied`; `entry.penaltyPaid += penaltyApplied`
4. Parallel UpdateCommand calls for all mutated entries
5. Write one PaymentEntry with full `appliedTo` audit trail

---

## New Files

| File | Purpose |
|---|---|
| `api/src/models/ledgerEntry.ts` | `ChargeEntry`, `PaymentEntry`, `LedgerEntry` types + factory functions |
| `api/src/repositories/ledgerRepository.ts` | DynamoDB access; `createChargeEntry`, `updateChargeEntry`, `listChargesByTenant`, `listPaymentsByTenant`, `getLedgerSummary`, `recordPaymentWithFIFO` |
| `api/src/handlers/ledger/handler.ts` | Routes: `POST /api/ledger/charges`, `GET /api/tenants/{id}/ledger`, `POST /api/tenants/{id}/payments` |
| `lynxbox-ph/src/features/invoicing/components/LedgerCsvUpload.tsx` | CSV import modal — follow existing `TenantCsvUpload.tsx` pattern |
| `lynxbox-ph/src/features/invoicing/components/LedgerView.tsx` | Charges table + payments table + accrued penalty column (computed client-side); embedded in tenant detail page |

---

## Existing Files to Modify

### Backend

**`api/src/lib/dynamodb.ts`** — add `LEDGER_ENTRY = 'LEDGER_ENTRY'` to EntityType enum

**`api/src/index.ts`** — add three routing blocks **before** the existing tenants block (order is critical):
```typescript
import { LedgerHandler } from './handlers/ledger/handler';

if (event.path?.includes('/api/tenants') && event.path?.includes('/ledger')) {
  return await LedgerHandler.handle(event);
}
if (event.path?.includes('/api/tenants') && event.path?.includes('/payments')) {
  return await LedgerHandler.handle(event);
}
if (event.path?.includes('/api/ledger')) {
  return await LedgerHandler.handle(event);
}
```

**`api/serverless.yml`** — add three new HTTP events after the tenants section:
```yaml
      - http:
          path: /api/ledger/charges
          method: post
          cors: true
          authorizer: { name: ApiGatewayAuthorizer, type: request }
      - http:
          path: /api/tenants/{id}/ledger
          method: get
          cors: true
          authorizer: { name: ApiGatewayAuthorizer, type: request }
      - http:
          path: /api/tenants/{id}/payments
          method: post
          cors: true
          authorizer: { name: ApiGatewayAuthorizer, type: request }
```
No IAM changes needed — existing `Resource: "*"` DynamoDB permissions cover the new operations.

**`api/src/handlers/invoices/handler.ts`** — two method changes:

In `createInvoice`, replace the `getUnpaidByTenant` block:
```typescript
// Remove: unpaid = getUnpaidByTenant, flat penalty rate, previousBalanceHistory map
// Replace with:
const { previousBalance, previousBalanceHistory } = await LedgerRepository.getLedgerSummary(
  tenantId, billingMonth, tenant.penaltyEnabled ?? true
);
```
After `InvoiceRepository.create(invoiceData)` succeeds, register the new invoice in the ledger:
```typescript
await LedgerRepository.createChargeEntry({
  tenantId, ownerId: userId, billingMonth,
  principalAmount: invoice.currentChargesTotal,
  invoiceNumber: invoice.invoiceNumber, invoiceId: invoice.id,
  description: `Invoice ${invoice.invoiceNumber} — ${billingLabel}`,
  source: 'invoice',
});
```
In `rolloverInvoice`, make the same `getLedgerSummary` replacement (no charge entry creation here — rollover only returns a draft, not a real invoice).

`InvoiceRepository.getUnpaidByTenant()` stays in the repo but is no longer called by handlers.

### Frontend

**`lynxbox-ph/src/features/invoicing/types.ts`** — append `AppliedTo`, `ChargeEntry`, `PaymentLedgerEntry`, `LedgerEntry`, `LedgerSummary` interfaces

**`lynxbox-ph/src/services/tenantService.ts`** — add three methods:
- `getLedger(id)` → `GET /api/tenants/{id}/ledger`
- `recordLedgerPayment(id, data)` → `POST /api/tenants/{id}/payments`
- `createLedgerCharge(data)` → `POST /api/ledger/charges`

**`lynxbox-ph/src/app/dashboard/tenants/page.tsx`** — add `useDisclosure` for `LedgerCsvUpload`, "Import Historical Balances" button in toolbar HStack, render `<LedgerCsvUpload>` at bottom alongside `<TenantCsvUpload>`

**`lynxbox-ph/src/app/dashboard/tenants/[id]/TenantDetailClient.tsx`** — add new Card after Contracts card:
- "Ledger & Outstanding Balances" heading with "Record Payment" button (green)
- `<LedgerView tenantId={id} penaltyEnabled={tenant.penaltyEnabled} />`
- `<PaymentModal>` wired to `tenantService.recordLedgerPayment()` (reuses existing PaymentModal component)

**`lynxbox-ph/src/app/dashboard/invoices/[id]/InvoiceDetailClient.tsx`** — no changes in this phase. Old `POST /api/invoices/:id/payments` stays for backward compatibility. **Superseded 2026-09-28 — see "Added beyond the original plan" #12 above:** the Record Payment button was later removed from this page entirely; tenant-level recording is now the only way to record a payment.

---

## Implementation Order

**Step 1 — Backend foundation** (deploy as one unit before touching UI)
1. Add `LEDGER_ENTRY` to EntityType
2. Create `ledgerEntry.ts` model
3. Create `ledgerRepository.ts` (FIFO engine is the most complex piece)
4. Create `ledger/handler.ts`
5. Update `index.ts` routing
6. Update `serverless.yml`

**Step 2 — CSV Import UI** (first user-facing feature; user imports historical data now)
7. Add ledger types to `types.ts`
8. Add service methods to `tenantService.ts`
9. Create `LedgerCsvUpload.tsx`
10. Add button to tenants list page

**Step 3 — Invoice creation update** (switch previous balance source to ledger)
11. Update `createInvoice` in handler
12. Update `rolloverInvoice` in handler

**Step 4 — Ledger view + tenant payment recording**
13. Create `LedgerView.tsx`
14. Update `TenantDetailClient.tsx`

---

## Verification

**Status:** the end-to-end flow (import Aug → bill Aug → record payment → bill Sept, using the "as of" override to check penalty math without waiting on the calendar) was walked through manually in sandbox this session and confirmed working, including the two payment-visibility additions in #4 above. The specific numeric scenarios below (1–6) reflect the original design intent and haven't each been individually re-verified against those exact figures — treat them as regression checks to run if the FIFO/penalty logic changes again.

1. **CSV import:** Upload a 6-row CSV (1 error, 1 duplicate, 4 valid). Expect 4 created entries. Confirm in DynamoDB: `GSI1PK = LEDGER#{tenantId}`, `GSI1SK` starts with `CHARGE#`.

2. **Penalty calculation:** Charge entry 3 months old, principal ₱12,000, `penaltyPaid = 0`. `GET /api/tenants/{id}/ledger` summary should show penalty = 12000 × 0.05 × 3 = ₱1,800.

3. **FIFO payment:** Tenant has Entry A (6mo old, ₱8,000 outstanding) and Entry B (3mo old, ₱15,000 outstanding). Entry A penalty = ₱2,400. Record ₱10,000 payment. Expected: Entry A penalty paid ₱2,400, Entry A principal reduced by ₱7,600 → principalOutstanding = ₱400. Entry B untouched.

4. **No double-billing:** After recording the ₱10,000 payment above, generate next month's invoice. Entry A's pending penalty = max(0, 400 × 0.05 × 7 - 2400) = max(0, 140 - 2400) = 0. Penalty for Entry A should be 0 in next invoice's `previousBalanceHistory`.

5. **New invoice previousBalance:** After CSV import, create a new invoice for the tenant. Invoice's `previousBalance` must exactly match `getLedgerSummary()` result for that billingMonth.

6. **New invoice creates ledger entry:** After creating an invoice, `GET /api/tenants/{id}/ledger` should contain a new `CHARGE#` entry with `source: 'invoice'`, `principalAmount = invoice.currentChargesTotal`, `invoiceId = invoice.id`.
