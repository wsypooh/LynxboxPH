# Rental Invoicing Feature — Implementation Plan (v4)

## Context

LynxboxPH landlords need a monthly billing system for commercial tenants. Each landlord manages **one or more buildings**, each with multiple units. Key workflow: manage buildings → manage tenants per building → enter monthly charges → generate Statement of Account PDF → send via email with PDF attached.

The `docs/invoicing/` mockups are content references (not UI blueprints). The actual UI will be responsive web.

**`/dashboard/documents` remains a dead link** — future feature for tenant contract/document uploads. Do not touch it.

---

## Key Decisions

| Topic | Decision |
|---|---|
| NPC/Electricity | NPC adjustment removed — incorporated into the electricity rate. Electricity section always shows (shows 0 if not applicable, never hidden). |
| Electricity rate | Building-level: landlord enters monthly rate once per building; pre-fills all tenant invoices for that building. Rate already incorporates NPC/distribution costs. |
| Water billing | Two modes per tenant: **Metered** (reading formula) or **Fixed** amount (fixed amount is entered in the invoice). |
| VAT | 12% of rent; controlled by `vatEnabled: boolean` on tenant; auto-computed when creating invoice; rounded to 2 decimal places |
| Withholding Tax | 5% of rent, deducted; controlled by `withholdingTaxEnabled: boolean` on tenant; auto-computed; **stored as a positive number**; displayed as deduction `(₱xxx)` in red; `subtotal = rent + vat - withholdingTax`; `Math.abs()` used defensively on all reads to handle legacy negative values; rounded to 2 decimal places |
| Penalty | Configurable per building (`penaltyRate`, default 5%); computed on each unpaid prior invoice's outstanding amount in `previousBalanceHistory` |
| Partial payments | `payments[]` array on invoice; `amountPaid` and `outstanding` recomputed on each payment |
| Contract history | Full history array on tenant; current contract = last entry |
| Tenant code | User-assignable; if not provided, auto-generate as `T-001`, `T-002` (sequential per landlord) |
| Invoice number | Auto-generated as `INV-YYYY-MM-{seq}` (sequential per billing month across all landlord invoices) |
| PDF delivery | Server-side: Lambda generates PDF with **pdfkit** (pure Node.js, no Chromium layer), attaches to ZeptoMail SMTP email |
| Batch PDF | "Download All" for a billing month — generates all tenant PDFs server-side, returns as a ZIP file. Core scope. |
| Statement of Account header | Comes from the **Building** entity (name, address, phone) — different per building |

---

## New Entity: Building

Each landlord can have multiple buildings. The Statement of Account header and electricity rate defaults live here.

**DynamoDB keys:**
```
PK:      BUILDING#{id}
SK:      BUILDING#{id}
GSI1PK:  USER#{ownerId}
GSI1SK:  BUILDING#{id}
entityType: BUILDING
```

**Fields:**
```ts
id: string
ownerId: string
name: string           // e.g. "Wilrose Drugstore Inc"
address: string        // e.g. "Burgos St., Bacolod City"
phone: string          // e.g. "460-8627"

// Updated monthly by landlord before creating invoices:
currentElectricityRate: number   // per kWh — incorporates NPC/distribution costs

// Billing policy (applies to all tenants in this building):
penaltyRate: number              // e.g. 0.05 = 5% per month on unpaid invoices (default 0.05)
earlyPaymentDiscountRate: number // e.g. 0.03 = 3% discount if paid within earlyPaymentDays (default 0)
earlyPaymentDays: number         // e.g. 5 (first 5 days of month) (default 5)

createdAt: string
updatedAt: string
```

---

## Phase 1 — Backend Models

### 1.1 Extend EntityType (`api/src/lib/dynamodb.ts`)
Add to `EntityType` enum:
```
BUILDING = 'BUILDING'
TENANT   = 'TENANT'
INVOICE  = 'INVOICE'
```

### 1.2 Building Model (`api/src/models/building.ts`)
Interface + `createBuilding()` factory following the `property.ts` pattern.

### 1.3 Tenant Model (`api/src/models/tenant.ts`)

**DynamoDB keys:**
```
PK:      TENANT#{id}
SK:      TENANT#{id}
GSI1PK:  USER#{ownerId}
GSI1SK:  TENANT#{id}
entityType: TENANT
```

**Fields:**
```ts
id: string
tenantCode: string        // User-set OR auto-generated "T-001"
ownerId: string
buildingId: string        // Links to Building entity
floor: string             // e.g. "3F"
roomNumber: string        // e.g. "Rm 10"
area: number              // sqm
lesseeName: string
contactEmail?: string
contactPhone?: string
tin?: string              // Tax Identification Number

// Billing defaults (pre-fill invoice form):
defaultRent: number
vatEnabled: boolean        // true → VAT = rent * 0.12
withholdingTaxEnabled: boolean  // true → WT = rent * 0.05
waterMode: 'metered' | 'fixed'
defaultWaterRate?: number   // per m³, if metered
defaultFixedWater?: number  // fixed monthly amount
defaultGuard?: number       // fixed monthly guard fee; pre-fills Guard field on invoice form
penaltyEnabled: boolean     // default true; if false, penalty = 0 on all this tenant's unpaid balances

status: 'active' | 'inactive'

// Full lease contract history:
contracts: {
  startDate: string     // ISO date
  endDate: string       // ISO date
  rentAmount: number
  deposit: number
  notes?: string
}[]
// contracts[contracts.length - 1] = current active contract
// leaseStartDate, leaseEndDate, deposit derived from current contract

createdAt: string
updatedAt: string
```

### 1.4 Invoice Model (`api/src/models/invoice.ts`)

**DynamoDB keys:**
```
PK:      INVOICE#{id}
SK:      INVOICE#{id}
GSI1PK:  TENANT#{tenantId}
GSI1SK:  INVOICE#{billingMonth}#{id}    (billingMonth = "2025-07")
entityType: INVOICE
```

**Fields:**
```ts
id: string
invoiceNumber: string      // "INV-2025-07-0001" (auto-generated)
ownerId: string
tenantId: string
buildingId: string

// Denormalized from Building + Tenant (for display/PDF without extra fetches):
buildingName: string
buildingAddress: string
buildingPhone: string
tenantCode: string
lesseeName: string
floor: string
roomNumber: string

billingMonth: string       // "2025-07" (GSI sort key prefix, sortable)
billingLabel: string       // "July 2025" (display)

// Charges (all PHP):
rent: number
vat: number                // 12% of rent if vatEnabled, else 0
withholdingTax: number     // 5% of rent if withholdingTaxEnabled, else 0; STORED AS POSITIVE; subtotal = rent + vat - withholdingTax

water: {
  mode: 'metered' | 'fixed'
  presentReading?: number
  previousReading?: number
  rate?: number
  amount: number            // computed or fixed
}

electricity: {
  presentReading: number
  previousReading: number
  rate: number               // rate incorporates NPC/distribution costs; pre-filled from building
  amount: number             // (present - previous) * rate; shows 0 if no consumption
}

guard: number

// Variable per-tenant charges with descriptions (e.g. "Generator Fee", "Parking"):
otherCharges: {
  description: string
  amount: number
}[]

discount: number             // Pre-filled from building earlyPaymentDiscountRate if applicable; editable

// Computed totals (server stores, client computes before submit):
subtotal: number                // rent + vat - withholdingTax
currentChargesTotal: number     // subtotal + water + electricity + guard + sum(otherCharges) - discount
previousBalance: number         // sum of outstanding from prior invoices
totalDue: number                // currentChargesTotal + previousBalance

// Payment tracking:
amountPaid: number              // sum of all payments received
outstanding: number             // totalDue - amountPaid
payments: {
  date: string
  amount: number
  note?: string
}[]

// Auto-populated from prior unpaid invoices at create time:
previousBalanceHistory: {
  invoiceNumber: string
  billingMonth: string
  billingLabel: string
  amountDue: number
  amountPaid: number
  outstanding: number
  penalty: number               // outstanding * penaltyRate (building setting, default 5%)
}[]

status: 'draft' | 'sent' | 'partial' | 'paid' | 'printed'
createdAt: string
updatedAt: string
```

**Status rules:**
- `draft`: not yet sent
- `sent`: email sent, no payments yet
- `partial`: `amountPaid > 0` and `outstanding > 0`
- `paid`: `outstanding <= 0`
- `printed`: manually marked as printed via bulk action; **locked from editing**

Status auto-updates on `recordPayment`. `printed` is set manually via `POST /api/invoices/{id}/printed`.

---

## Phase 2 — Backend Repositories

All follow the static-method pattern of `propertyRepository.ts`.

### `api/src/repositories/buildingRepository.ts`
- `create`, `findById`, `update`, `delete`, `listByOwner(ownerId)` — QueryCommand on GSI1, `begins_with(GSI1SK, 'BUILDING#')`

### `api/src/repositories/tenantRepository.ts`
- `create(data, ownerId)` — auto-generates `tenantCode` if not provided (count `listByOwner` length + 1, format `T-{n padded 3}`)
- `findById`, `update(id, ownerId, updates)`, `delete(id, ownerId)`
- `listByOwner(ownerId)` — QueryCommand on GSI1, `begins_with(GSI1SK, 'TENANT#')`
- `listByBuilding(ownerId, buildingId)` — `listByOwner` filtered in-memory on `buildingId`

### `api/src/repositories/invoiceRepository.ts`
- `create(data)` — auto-generates `invoiceNumber` (count invoices for that `billingMonth` + 1)
- `findById`, `update(id, ownerId, updates)`, `delete(id, ownerId)`
- `listByTenant(tenantId)` — QueryCommand on GSI1, `ScanIndexForward: false`
- `listByOwner(ownerId, tenantIds[])` — `listByTenant` per tenantId, merged + sorted
- `getUnpaidByTenant(tenantId)` — `listByTenant` filtered to `status !== 'paid'`; used to build `previousBalanceHistory` + compute penalties

---

## Phase 3 — Backend Handlers

All handlers use the same auth extraction pattern as `properties/handler.ts`:
```ts
const userId = event.requestContext.authorizer?.claims?.sub
  || event.requestContext.authorizer?.claims?.['cognito:username']
  || (process.env.IS_OFFLINE ? 'test-user-id' : null);
if (!userId) return ApiResponse.unauthorized('...');
```

### `api/src/handlers/buildings/handler.ts` — `BuildingHandler`
```
GET    /api/buildings              listBuildings
POST   /api/buildings              createBuilding
GET    /api/buildings/{id}         getBuilding
PUT    /api/buildings/{id}         updateBuilding  (updates currentElectricityRate, penaltyRate, discount policy monthly)
DELETE /api/buildings/{id}         deleteBuilding
GET    /api/buildings/{id}/tenants listTenantsByBuilding
```

### `api/src/handlers/tenants/handler.ts` — `TenantHandler`
```
GET    /api/tenants                listTenants       (?buildingId= optional filter)
POST   /api/tenants                createTenant
GET    /api/tenants/{id}           getTenant
PUT    /api/tenants/{id}           updateTenant      (includes addContract action via ?action=renew)
DELETE /api/tenants/{id}           deleteTenant
GET    /api/tenants/{id}/invoices  listInvoicesByTenant
```

`PUT /api/tenants/{id}?action=renew`: appends a new entry to `contracts[]` (new lease dates + rent + deposit). Does NOT modify `defaultRent` automatically — landlord updates that separately if desired.

### `api/src/handlers/invoices/handler.ts` — `InvoiceHandler`
```
GET    /api/invoices               listInvoices          (?tenantId=, ?billingMonth=, ?status=)
POST   /api/invoices               createInvoice
GET    /api/invoices/{id}          getInvoice
PUT    /api/invoices/{id}          updateInvoice         (edit charges before sending; blocked if status=printed)
DELETE /api/invoices/{id}          deleteInvoice
POST   /api/invoices/{id}/payments recordPayment         (body: { amount, date, note? })
POST   /api/invoices/{id}/send     sendInvoice           (generates PDF, sends email)
POST   /api/invoices/{id}/printed  markAsPrinted         (sets status=printed, locks invoice from editing)
POST   /api/invoices/{id}/rollover rolloverInvoice       (returns pre-filled next-month InvoiceInput; does NOT save)
GET    /api/invoices/{id}/pdf      downloadInvoicePdf    (returns PDF bytes)
POST   /api/invoices/batch-pdf     downloadBatchPdf      (body: { ids: string[] } — generates ZIP of selected PDFs)
```

**`createInvoice` flow:**
1. Extract `userId`, parse body. Require `tenantId` + `billingMonth`.
2. Fetch tenant, verify `tenant.ownerId === userId`.
3. Fetch building via `tenant.buildingId`.
4. Denormalize building + tenant fields into invoice.
5. Auto-populate `rent`, `vat`, `withholdingTax` from tenant defaults (withholdingTax stored positive; `guard` pre-filled from `tenant.defaultGuard`).
6. Auto-populate `electricity.rate` from building's `currentElectricityRate`.
7. Call `getUnpaidByTenant(tenantId)` → build `previousBalanceHistory` with `penalty = outstanding * (tenant.penaltyEnabled ? building.penaltyRate : 0)`, sum as `previousBalance`.
8. Compute all totals: `subtotal = rent + vat - withholdingTax`. Set `status = 'draft'`. Save.

**`rolloverInvoice` flow:**
1. Fetch source invoice.
2. Compute next `billingMonth` (increment by 1 month).
3. Copy all charge fields from source (rent, rates, water settings, guard, otherCharges).
4. Reset meter readings to 0 (present = previous = 0).
5. Re-fetch building for current electricity rate (may have changed month-to-month).
6. Re-compute `previousBalanceHistory` + `previousBalance` from current unpaid invoices.
7. Return the draft `InvoiceInput` — **do not save yet**. Return as 200 with the pre-filled data so the frontend opens the invoice form pre-filled.

**`recordPayment` flow:**
1. Fetch invoice, verify ownership.
2. Append `{ date, amount, note }` to `payments[]`.
3. Recompute: `amountPaid = sum(payments[].amount)`, `outstanding = totalDue - amountPaid`.
4. Update `status`: `'paid'` if `outstanding <= 0`, `'partial'` if `amountPaid > 0`.
5. Save update.

**`sendInvoice` + `downloadInvoicePdf`:**
Shared PDF generation function:
1. Fetch invoice (building data already denormalized in invoice).
2. Use `pdfkit` to generate Statement of Account PDF matching the mockup layout.
3. For `sendInvoice`: pipe PDF buffer into Nodemailer `attachments[]` and send via ZeptoMail SMTP. Update `status = 'sent'`. Email body: brief notification ("Please find attached your Statement of Account for [billingLabel].").
4. For `downloadInvoicePdf`: return PDF buffer as response with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename=INV-2025-07-0001.pdf`.

---

## Phase 4 — Route Registration

### `api/src/index.ts`
Add before the `propertyHandler` fallthrough:
```ts
if (event.path?.includes('/api/buildings')) return await buildingHandler(event);
if (event.path?.includes('/api/tenants') && event.path?.includes('/invoices'))
  return await invoiceHandler(event);   // /api/tenants/{id}/invoices
if (event.path?.includes('/api/tenants')) return await tenantHandler(event);
if (event.path?.includes('/api/invoices')) return await invoiceHandler(event);
```

### `api/serverless.yml`
Add HTTP events (all with `ApiGatewayAuthorizer`) for all new routes:
- Buildings: GET/POST `/api/buildings`, GET/PUT/DELETE `/api/buildings/{id}`, GET `/api/buildings/{id}/tenants`
- Tenants: GET/POST `/api/tenants`, GET/PUT/DELETE `/api/tenants/{id}`, GET `/api/tenants/{id}/invoices`
- Invoices: GET/POST `/api/invoices`, GET `/api/invoices/batch-pdf`, GET/PUT/DELETE `/api/invoices/{id}`, POST `/api/invoices/{id}/payments`, POST `/api/invoices/{id}/send`, POST `/api/invoices/{id}/rollover`, GET `/api/invoices/{id}/pdf`

### `api/local-server.ts`
Register all new routes using the existing `handlePropertyRequest` helper.

---

## Phase 5 — PDF Generation

Add `pdfkit` dependency to `api/`:
```
npm install pdfkit @types/pdfkit
```

Create `api/src/lib/pdf.ts` — `PdfService` class:
```ts
class PdfService {
  generateInvoicePdf(invoice: Invoice): Buffer
}
```

PDF layout mirrors the Statement of Account mockup:
1. **Header block**: Building name, address, phone (from denormalized fields)
2. **Title**: "Statement of Account for the Month of [billingLabel]"
3. **Tenant line**: Lessee name | Door No: [floor] [roomNumber]
4. **Current Charges table**: Line items (Rent, VAT, Less: Withholding Tax, Subtotal, Water, Electricity [reading calculation], Guard, each `otherCharges` row, Discount)
5. **Previous Balance table**: Invoice # | Billing Period | Amount Due | Paid | Outstanding | Penalty
6. **Totals**: Total Current Charge, Previous Balance, Grand Total

### ZeptoMail changes (`api/src/lib/zeptomail.ts`)
Add:
```ts
async sendInvoiceEmail(invoice: Invoice, pdfBuffer: Buffer): Promise<void>
```
- Subject: `Statement of Account — [billingLabel] | [invoiceNumber]`
- Body: Brief HTML notification matching existing email style (`#0e2949` header)
- Attachment: `{ filename: '[invoiceNumber].pdf', content: pdfBuffer, contentType: 'application/pdf' }`

---

## Phase 6 — Frontend Types

### `lynxbox-ph/src/features/invoicing/types.ts`
Exports: `Building`, `BuildingInput`, `Tenant`, `TenantInput`, `Contract`, `WaterCharge`, `ElectricityCharge`, `OtherCharge`, `Payment`, `PreviousBalanceEntry`, `Invoice`, `InvoiceInput`, `InvoiceStatus`, `WaterMode`

*`TenantInput` and `InvoiceInput` are TypeScript types representing the writable API fields — they exclude auto-generated fields like `id`, `invoiceNumber`, `tenantCode` (when auto-generated), `ownerId`, `createdAt`, `updatedAt`, and server-computed fields like `outstanding`, `status`.*

---

## Phase 7 — Frontend Services

All services: singleton class, private `request<T>()` copied from `propertyService.ts`.

- `lynxbox-ph/src/services/buildingService.ts` — CRUD + `listTenantsByBuilding`
- `lynxbox-ph/src/services/tenantService.ts` — CRUD + `renewContract`, `listInvoicesByTenant`
- `lynxbox-ph/src/services/invoiceService.ts` — CRUD + `recordPayment`, `sendInvoice`, `rolloverInvoice`, `downloadPdf`, `downloadBatchPdf`

`downloadPdf(id)`: calls `GET /api/invoices/{id}/pdf`, receives blob, triggers browser download.
`downloadBatchPdf(billingMonth)`: calls `GET /api/invoices/batch-pdf?billingMonth=…`, downloads ZIP.

---

## Phase 8 — Frontend Components

### `features/invoicing/components/BuildingForm.tsx`
Fields: Name, Address, Phone, Current Electricity Rate (per kWh — incorporates all costs), Penalty Rate (e.g. 5%), Early Payment Discount Rate (e.g. 3%), Early Payment Days (e.g. 5). Used in add/edit building modal.

### `features/invoicing/components/TenantForm.tsx`
Zod + react-hook-form. Sections:
- **Unit**: Building (dropdown), Floor, Room Number, Area
- **Lessee**: Name, Email, Phone, TIN, Tenant Code (editable; auto-generated if blank)
- **Billing Defaults**: Default Rent, VAT Enabled (toggle), Withholding Tax Enabled (toggle), Water Mode + Rate/Fixed Amount, Default Water Fixed Amount, **Default Guard (₱)** (pre-fills Guard field on invoice form), **Penalty Enabled** (toggle; default on; disables penalty charge on outstanding balances for this tenant)
- **Contract**: Start Date, End Date, Deposit, Notes (adds to `contracts[]`)

### `features/invoicing/components/InvoiceForm.tsx`
Responsive charge-entry form. Sections:
- **Header** (read-only): Tenant dropdown → auto-fills building/floor/room; Billing Month picker
- **Rent & Tax**: Rent (pre-filled from tenant default), VAT (auto-computed rounded to 2dp if enabled, editable), Withholding Tax (auto-computed rounded to 2dp, editable; normalized to positive on load via `Math.abs`)
- **Water**: Mode toggle (Metered/Fixed) → shows meter fields or fixed amount; auto-computes amount
- **Electricity**: Present/Previous Reading, Rate (pre-filled from building's `currentElectricityRate`), auto-computes kWh amount. Always shown; enters 0 if no consumption.
- **Other Charges**: Guard (pre-filled from `tenant.defaultGuard`), dynamic list of `otherCharges` (description + amount rows, "Add Row" button for items like "Generator Fee"), Discount (pre-filled from building policy if applicable)
- **Summary** (read-only, live-computed): Rent, VAT (12%), Less: Withholding Tax (5%) shown in red as deduction, Subtotal (with spacer below), Current Charges Total, Previous Balance (from API), Total Due
- **Previous Balance History**: read-only table showing unpaid prior invoices with penalty

### `features/invoicing/components/StatementOfAccount.tsx`
Printable view component (matches mockup layout). Used in the invoice detail page preview tab. "Download PDF" button calls `invoiceService.downloadPdf()`.

Layout details:
- "Current Charges" header bar (`#0e2949`) has **"Amount" label right-aligned on the same line** (not a separate table header column)
- Withholding Tax displayed as `(₱xxx)` using `Math.abs()` on the stored value
- "Download PDF" button hidden on print via `.no-print` CSS class

### `features/invoicing/components/PaymentModal.tsx`
Modal: Amount, Date, Note → calls `invoiceService.recordPayment()`.

### `features/invoicing/components/TenantList.tsx`
Table: Tenant Code, Lessee, Building, Unit, Current Lease End (badge if ≤30 days), Status, Actions.

### `features/invoicing/components/InvoiceList.tsx`
Table with:
- **Checkbox column** for multi-select; "select all" in header
- **Fixed columns**: Invoice #, Lessee, Building, Period, Total, Paid, Outstanding, Status badge, Actions (View, Del)
- **Optional toggle columns** (persisted in localStorage): Lessee No., Rent, VAT, Withholding (shown as deduction), Water, Electricity, Guard, Other Charges — toggled via "Columns" dropdown
- **Footer totals row**: sums all numeric optional columns + Total/Paid/Outstanding
- **Bulk Actions menu** (shown when ≥1 selected): Download PDF, Mark as Printed (locks invoices), Rollover to Next Month
- **Export CSV** button — exports all currently filtered invoices
- Withholding shown as `(₱xxx)` in red; sums as negative in totals and CSV
- Filter month defaults to **current month** on page load

---

## Phase 9 — Frontend Pages

### New pages structure:
```
dashboard/
  buildings/
    page.tsx             — Building list + add/edit building
  tenants/
    page.tsx             — Tenant list (filterable by building)
    [id]/page.tsx        — Tenant detail: edit + contract history + invoice history
  invoices/
    page.tsx             — Invoice list (filterable by building/tenant/month/status)
    new/page.tsx         — New invoice form (pre-selects tenant from ?tenantId=)
    [id]/page.tsx        — Invoice detail: edit tab + Statement preview tab + actions
```

All pages: auth guard via `useEffect` → redirect to `/auth/signin`.

**Invoice detail page (`/dashboard/invoices/[id]`):**
- Tab 1 "Edit": `InvoiceForm` in edit mode (user corrects electricity/water readings before sending)
- Tab 2 "Statement": `StatementOfAccount` component + Print button
- Action bar: "Record Payment", "Send (Email PDF)", "Roll Over to Next Month", "Download PDF", "Delete"
- Status badge updates in real time after payment recording

---

## Phase 10 — Dashboard Navigation

- Add "Buildings" link → `/dashboard/buildings`
- `/dashboard/tenants` already exists — no change
- Add "Invoices" card to dashboard quick-actions → `/dashboard/invoices`
- **Leave `/dashboard/documents` dead link intact** — future tenant document storage feature

---

## Implementation Notes (Post-Build Decisions)

| Area | Decision |
|---|---|
| `withholdingTax` sign | Stored as **positive**. `subtotal = rent + vat - withholdingTax`. `Math.abs()` used on all reads as defensive guard against any legacy negative values. |
| VAT / WT rounding | Auto-computed values rounded to 2 decimal places: `Math.round(rent * rate * 100) / 100` |
| Guard default | Added `defaultGuard?: number` to Tenant. Pre-fills `guard` in invoice form and handler. Shown in Tenant detail page Billing Defaults card when > 0. |
| Penalty per tenant | Added `penaltyEnabled: boolean` (default `true`) to Tenant. When `false`, penalty is set to 0 for all this tenant's entries in `previousBalanceHistory`. Applied in both `createInvoice` and `rolloverInvoice`. Shown in Tenant detail Billing Defaults card. |
| Invoice `printed` status | New status added. Set via `POST /api/invoices/{id}/printed`. Blocks `updateInvoice`. Distinct from `sent` — for physical printouts. |
| Batch PDF | Implemented as `POST /api/invoices/batch-pdf` with `{ ids: string[] }` body (not GET with billingMonth). Supports arbitrary selection, not just full month. |
| SOA header "Amount" | Rendered inline in the dark header bar using `HStack justify="space-between"` — no separate `<Th>` column. |
| PDF right-alignment | **Unresolved.** pdfkit `align: 'right'` and manual `widthOfString()` positioning have both failed for the Amount column in Current Charges / Totals sections. Previous Balance columns work fine (chained calls). See memory file `project_pdf_alignment.md` for full history. |

---

## Future Scope (Noted, Not Planned Now)
- Contract renewal reminder emails (cron job checking `leaseEndDate` within 30 days)
- Yearly rent increase: update `defaultRent` on tenant; next invoice auto-uses new amount
- Electric bill computation tool (enter total bill + usage → auto-compute rate per kWh)
- `/dashboard/documents` — tenant contract/document file uploads

---

## Verification Steps

1. **Backend (local)**: Start `api/local-server.ts` → curl:
   - POST `/api/buildings` → GET `/api/buildings` → verify `GSI1PK = USER#{id}`
   - POST `/api/tenants` (with `buildingId`) → verify `tenantCode` auto-assigned
   - POST `/api/invoices` → verify building/tenant denormalization + `previousBalanceHistory = []`
   - POST second invoice (next month) → verify prior appears in `previousBalanceHistory` with `penalty = outstanding * 0.05`
   - POST `/api/invoices/{id}/payments` → verify `outstanding` decreases, status becomes `partial` then `paid`
   - GET `/api/invoices/{id}/pdf` → verify PDF downloads with correct layout
   - POST `/api/invoices/{id}/send` → verify email with PDF attachment arrives
   - GET `/api/invoices/batch-pdf?billingMonth=2025-07` → verify ZIP downloads

2. **Frontend** (`npm run dev` port 3001):
   - Sign in → `/dashboard/buildings` → create building
   - `/dashboard/tenants` → create tenant in that building → verify VAT/WT toggles
   - `/dashboard/invoices/new` → select tenant → fill charges → verify totals auto-compute → submit
   - Invoice detail: Switch tabs (Edit → Statement) → verify layout matches mockup
   - Record partial payment → status → `partial`; record remainder → status → `paid`
   - "Roll Over" → next month form opens pre-filled with rates from current invoice

3. **Responsive**: All pages work at 400px, 768px, 1200px.
