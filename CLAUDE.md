# LynxboxPH

Property/tenant/invoice management system. Two apps in this repo:

- `api/` — AWS Lambda API (Serverless Framework, Node/TypeScript), single DynamoDB table
- `lynxbox-ph/` — Next.js 14 frontend (Chakra UI, react-hook-form + zod)

## ⚠️ Two separate route configs — both must be updated for a new endpoint

- `api/serverless.yml` is **local-dev only** (drives `serverless-offline` and the Express `local-server.ts` wrapper used by `npm run dev`). Editing it has **zero effect** on any deployed environment (sandbox/prod).
- `infra/modules/api/routes.tf` is the **actual deployed** API Gateway config (Terraform, applied via `infra/scripts/deploy-infra.ps1` → `terraform apply`). This is the one real environments read.

Whenever you add a new Lambda handler/route, add it to **both**:
1. `api/serverless.yml` — an `- http:` block (see pattern below), for local dev.
2. `infra/modules/api/routes.tf` — an `aws_apigatewayv2_route` block with `authorization_type = "JWT"` and `authorizer_id = aws_apigatewayv2_authorizer.cognito.id`, for it to work anywhere real.
3. `api/local-server.ts` — also needs an explicit `app.all('/api/...', ...)` registration (see Backend section below); it's a third, separate route list.

If a route is missing from `routes.tf`, it falls through to `$default`, which has no authorizer attached — `event.requestContext.authorizer?.claims` comes back null, every handler's `getUserId()` returns null, and you get a 401 that never even reaches your handler's own code (check CloudWatch for the handler's console output to confirm Lambda wasn't invoked at all, before assuming it's an app bug). A route deployed with the JWT authorizer correctly still rejects unauthenticated/expired tokens the same way — the giveaway that it's a missing-route problem rather than a bad-token problem is that *other* endpoints using the same token succeed while this one alone 401s.

## Backend (`api/`)

**Single-table DynamoDB design.** One table (`process.env.DYNAMODB_TABLE`, default `lynxbox-ph-dev`), one GSI (`GSI1`). Entity types declared in `api/src/lib/dynamodb.ts` (`EntityType` enum) — this is the only place entity types are registered. `ddbDocClient` is exported from there too.

**Models** (`api/src/models/*.ts`): interface extends `BaseEntity`, adds `[key: string]: any` (lets the generic repo `update()` iterate fields), plus a hand-written `XInput` type and a factory `createX(data: XInput, code): X` using `uuidv4()` + `new Date().toISOString()`. The factory builds `PK`/`SK`/`GSI1PK`/`GSI1SK` explicitly as template strings, e.g. `PK: 'INVOICE#'+id`, `GSI1PK: 'TENANT#'+tenantId`, `GSI1SK: 'INVOICE#'+billingMonth+'#'+id` (GSI1 = "list by parent, sorted/filtered by a natural key").

**Repositories** (`api/src/repositories/*Repository.ts`): static-method classes, own `TABLE_NAME` const. Every repo has an identical dynamic `update()` builder (iterates `Object.entries(updates)`, skips key/meta fields, builds `#name`/`:value` maps, always bumps `updatedAt`, `ReturnValues: 'ALL_NEW'` — copy this verbatim for new repos). Soft delete = `update(id, { deletedAt: now })`. Listing "by parent" = `QueryCommand` on GSI1 with `begins_with(GSI1SK, prefix)`. No batch/transaction commands anywhere — parallelism is `Promise.all` over per-item Get/Put/Update/Query, aggregation/filtering happens in JS after the fetch.

**Handlers** (`api/src/handlers/*/handler.ts`): static-method classes. Shared per-file helpers `getUserId(event)` (reads Cognito claims, falls back to `local-test-user-123` when `IS_OFFLINE`) and `getXId(event)` (regex on `event.path`, not `pathParameters`). `handle()` is an if/else-if dispatcher ordered **most-specific path first** (sub-paths like `.../payments` before the generic `/{id}` routes; the generic GET explicitly excludes the bare list path). All responses go through `ApiResponse.success/error/notFound/unauthorized` (`api/src/lib/apiResponse.ts`). Ownership check is always `if (!x || x.ownerId !== userId || x.deletedAt) return ApiResponse.notFound(...)`.

**`api/src/index.ts`** routes by `event.path?.includes(...)` string checks (not path params), most-specific first, falling through to `propertyHandler` last.

**`api/serverless.yml`**: one `- http:` block per method+path, `cors: true` + `authorizer: { name: ApiGatewayAuthorizer, type: request }` on every protected route (public routes under `/api/public/*` and `/api/signup` omit the authorizer). IAM already grants generic `dynamodb:{Query,Scan,GetItem,PutItem,UpdateItem,DeleteItem}` on `Resource: "*"` — new entity types need no IAM change. Local-dev only — see the callout at the top of this file.

**`api/local-server.ts`**: the actual thing `npm run dev` runs (`ts-node-dev` over this file, which imports the compiled `./dist/index`). It's a hand-rolled Express wrapper that explicitly registers every route with `app.all('/api/...', ...)` — there's no wildcard/proxy matching, so a new route needs its own `app.all(...)` line here too, or it 404s locally even though the Lambda handler code is correct.

**`infra/modules/api/routes.tf`**: the real, deployed API Gateway routes (Terraform). One `aws_apigatewayv2_route` block per method+path, `authorization_type = "JWT"` + `authorizer_id = aws_apigatewayv2_authorizer.cognito.id` on every protected route. Applied via `infra/scripts/deploy-infra.ps1` (needs a live AWS SSO session) → `terraform plan`/`apply`. See the callout at the top of this file — this is the file that actually matters for sandbox/prod.

## Ledger System

Tenant charges and payments live in a separate ledger (`ChargeEntry` / `PaymentEntry` in `api/src/models/ledgerEntry.ts`, `LedgerRepository`), not on the `Invoice` record directly. Full design, every deviation from the original plan, and current status are in `docs/Ledger-Plan.md` — read that before touching penalty or payment logic; it's kept up to date, not just a historical spec.

Quick orientation:
- **FIFO payment application**: `LedgerRepository.recordPaymentWithFIFO` always settles the oldest unpaid `ChargeEntry` first, penalty before principal, using `penaltyPaid` to avoid re-billing already-collected penalty (simple interest on the *remaining* principal, not the original amount — see the doc if this looks like it's undercharging, it's usually by design).
- **Void, not delete, for non-draft invoices**: `InvoiceHandler.deleteInvoice` only works on `draft`; anything else goes through `POST /api/invoices/{id}/void`, which soft-deletes the linked `ChargeEntry` but keeps the invoice record and its number (avoids invoice-number reuse, preserves audit trail).
- **Two payment views on an invoice are intentionally different, not duplicates**: `ledgerPayments` (what actually settled *this invoice's own* charge — often empty, since FIFO pays the oldest charge first) vs `paymentsReceived` (everything received since the tenant's *previous* invoice, regardless of which charge it hit — this is the one shown on the customer-facing Statement of Account / PDF).

## Documents Feature

Buildings and tenants can each have `Document` records (SEC certs, business permits, lease PDFs, government IDs) attached, uploaded direct-to-S3 via presigned URL. Full design and the decisions behind it are in `docs/Documents-Feature-Plan.md` — read that before touching upload/S3-key logic; it's kept up to date, including the deviations noted below, not just a historical spec.

Quick orientation:
- **S3 key is a UUID, never the original filename.** `S3Service.getPresignedUploadUrl` names the object `<folderPrefix>/<uuid>.<ext>` to avoid collisions/unsafe characters — the human-readable name only ever lives in `Document.fileName`. To make downloads/previews still show the original name, `S3Service.getPresignedViewUrl(key, expiresIn, downloadFileName?)` signs a `ResponseContentDisposition` header (built by `buildContentDisposition()`) into the URL whenever a filename is passed — `DocumentHandler.getViewUrl` always passes `document.fileName`. If you add another S3-key-based download path, pass the filename through the same way or you'll get UUID-named downloads.
- **Row actions are icon buttons, not text buttons**, across `DocumentList`/`TenantList`/`InvoiceList`/buildings page: `FiEye` (view), `FiEdit2` (edit), `FiTrash2` (delete), `FiSlash` (void, kept visually distinct from delete). `DocumentList` has its own `DocumentEditModal` for post-upload edits (category/expiryDate/notes via `PUT /api/documents/{id}`) — this wasn't in the original plan's UI section, added afterward since notes/category are otherwise only ever set once, at upload time.
- **`TenantContract.id`** is generated client-side the moment a new contract row is added in `TenantForm.tsx`, using `crypto.randomUUID()` (the frontend has no `uuid` package dependency — don't add one, this is the established pattern). Legacy contract rows saved before this feature existed have no `id` and simply can't have a document attached — that's intentional, not a bug to fix by retrofitting an id on read. `useFieldArray` in `TenantForm.tsx` uses `keyName: '_key'` specifically to stop React Hook Form's own internal row key from colliding with this domain `id` field.
- Document's own frontend types live in `features/documents/types.ts` (not `features/invoicing/types.ts`) since documents aren't part of the invoicing domain — mirror this split for any future non-invoicing entity.

## Frontend (`lynxbox-ph/`)

**Services** (`src/services/*Service.ts`): singleton class instance exported at the bottom. Private `request<T>()` wraps `fetch`, attaches auth headers via `getAuthHeaders()`, and unwraps the API's `{ success, data }` envelope to just `data`. Each public method calls `request<{ x: T }>(...)` and returns `res.x`.

**Components**: Chakra UI throughout. One `useDisclosure()` per modal. CSV import components (see `TenantCsvUpload.tsx`) follow: module-level `CSV_HEADERS`/`EXAMPLE_ROW`, hand-rolled `parseCSV`, a `validateRow()` pure function producing `{ rowNum, data, errors, payload }`, template download via Blob + synthetic `<a>` click, sequential (not `Promise.all`) import loop with a progress bar, toast summary at the end. `PaymentModal` (`features/invoicing/components/PaymentModal.tsx`) is generic/reusable — just `amount`/`date`/`paymentMethod`/`note` — wire it to any `onSubmit` rather than writing a new payment form.

**List rows/tables**: row-level actions (`TenantList`, `InvoiceList`, `DocumentList`, building cards) are icon-only `IconButton`s (`react-icons/fi`) wrapped in a Chakra `Tooltip` with a short label, not text buttons — match this for any new action rather than adding a labeled `Button`. In `TenantList`/`InvoiceList`, the whole `<Tr>` is clickable (`cursor="pointer"`, `onClick` navigates to the record's view page) and the checkbox/Actions `<Td>` calls `e.stopPropagation()` so per-row controls don't also trigger navigation — follow the same pair (row `onClick` + `stopPropagation` on interactive cells) for any new clickable list.

**Types**: `src/features/invoicing/types.ts` is the single frontend contract-types file; new domain types go here.
