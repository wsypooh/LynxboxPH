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
6. **"+ New Invoice" now carries forward meter readings.** Previously only "Roll Over" did this; a blank new invoice created from the tenant page always reset `electricity.previousReading`/`water.previousReading` to 0. Fixed by looking up the tenant's most recent invoice on page load and seeding those fields from it.
7. **Simplified the customer-facing Previous Balance table** — dropped the Due/Paid columns (kept Outstanding/Penalty only) on the Statement of Account and PDF after they contributed to the double-counting confusion in #4; the internal `InvoiceForm` edit table keeps the full breakdown since that one is a business tool, not customer-facing.

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
pendingPenalty(entry, currentBillingMonth) =
  max(0, entry.principalOutstanding × 0.05 × monthsOverdue - entry.penaltyPaid)
```
- `monthsOverdue = (currentYear - chargeYear) × 12 + (currentMonth - chargeMonth)`, min 0
- Simple interest on remaining principal — NOT compound
- `penaltyPaid` ensures penalty already collected is not re-billed next month

### FIFO payment application (in `LedgerRepository.recordPaymentWithFIFO`)
1. Load all ChargeEntries for tenant ordered by billingMonth ascending (oldest first)
2. Filter to `principalOutstanding > 0`
3. Walk with `remaining` counter:
   - `penaltyApplied = min(remaining, pendingPenalty(entry))`; remaining -= penaltyApplied
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

**`lynxbox-ph/src/app/dashboard/invoices/[id]/InvoiceDetailClient.tsx`** — no changes in this phase. Old `POST /api/invoices/:id/payments` stays for backward compatibility.

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
