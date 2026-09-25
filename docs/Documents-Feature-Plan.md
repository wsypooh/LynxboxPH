# Documents Feature — Plan

Status: **implemented**. This doc is kept up to date, not just a historical spec — see "Deviations from plan" at the bottom for what changed during/after implementation. Read that section before touching upload/S3-key/view-URL logic.

## Context

Buildings and tenants currently have no way to store supporting paperwork (SEC certificates, business permits, lease contracts, government IDs, etc.) — this information exists only on paper or outside the system. The app already has a working file-storage layer (`S3Service`, `api/src/lib/s3.ts`) built for property listing images, backed by a single shared S3 bucket (`infra/modules/s3/main.tf`) namespaced by key prefix. This feature generalizes that existing pattern to a new `Document` entity attachable to a Building or a Tenant, rather than building file storage from scratch.

There is already a **"Documents" nav link and dashboard card** pointing at `/dashboard/documents` (`DashboardSidebar.tsx:15`, `app/dashboard/page.tsx:348-366`) — that route does not exist and is currently a dead link. Since documents in this feature are scoped to a specific Building or Tenant (not a global list), that sidebar entry and dashboard card are removed rather than built out.

## Key decisions

- **Upload method — presigned URL, direct-to-S3.** Verified by grep that `PropertyForm.tsx` (the only *live* property-image upload path, at the time this was written) sent images as base64 in the JSON body through the Lambda. A presigned-URL direct-to-S3 method already existed in the code (`S3Service.getPresignedUploadUrl`, `s3.ts:237-257`; `propertyService.uploadPropertyImage`, `propertyService.ts:422`) but had **zero callers** — it was unused scaffolding. Documents used presigned URLs direct-to-S3 (better for larger PDFs, avoids Lambda/API Gateway payload limits), generalizing that existing scaffold rather than copying the base64 pattern.
  - **Update:** `PropertyForm.tsx` has since been migrated to this same presigned-URL flow too (base64 fully removed). Unlike Documents, property images get server-side watermarking/resizing (`ImageProcessingService`) — since the raw bytes now never pass through Lambda on the PUT itself, that required an extra step Documents doesn't need: a `POST /api/properties/{id}/images/confirm` endpoint that downloads the just-uploaded object from S3, runs it through the watermark/resize pipeline, and overwrites it in place (`S3Service.processUploadedImage`, `PropertyHandler.confirmImageUpload`). A new property has no id yet at upload time, so the client now generates the property id upfront (`crypto.randomUUID()`, same pattern as `TenantContract.id`) and reuses it through upload → confirm → create.
- **What gets persisted.** Verified that today's property-image flow explicitly strips `base64Images` before writing to DynamoDB (`api/src/handlers/properties/handler.ts:75-76`) — only the resulting S3 key strings ever reach the `images: string[]` field; no file bytes or base64 are ever stored. `Document` follows the same rule: it stores only `s3Key` (a string), never base64 or a URL. Because documents go browser→S3 directly via presigned PUT, base64 doesn't even transit through Lambda for this feature.
- **Contract linking — `Document.contractId`, not `TenantContract.documentId`.** Tenant lease contracts are stored as an embedded array on Tenant (`TenantContract`, `tenant.ts:4-10`) with no `id` today. To let a specific lease PDF attach to a specific contract row (see UI section below), `TenantContract` gets an optional `id`, and `Document` gets an optional `contractId` pointing at it — not the other way around:
  - **Multiple documents per contract** stays simple: a contract could reasonably have more than one attachment over time (signed lease, notarized copy, later amendment). A `contractId` filter over `Document` records has no structural limit; `documentIds: string[]` nested inside an array item on Tenant would.
  - **Consistent reference direction**: every relationship in this schema already points child→parent (`Document.parentId` → Building/Tenant, `Tenant.buildingId` → Building). `Document.contractId` continues that pattern one level deeper.
  - **Isolated writes**: attaching/replacing/removing a document only ever touches the `Document` record via the standard generic `update()`. If the pointer lived on the contract instead, every attach/replace/remove would require a read-modify-write of the tenant's entire `contracts` array, and risks clobbering a concurrent contract edit.
  - **No dangling references on delete**: soft-deleting a `Document` just makes its `contractId` moot. The reverse direction would leave a stale pointer on the Tenant record that something would have to notice and clear.
  - `TenantContract.id` is generated **client-side** (`uuidv4()`) the moment a contract row is added in the Edit Tenant form — no backend round-trip needed, it just travels along with the rest of the contract data on save. Existing contract rows without an `id` simply can't have a document linked to them, which is fine.
- **Expiry tracking.** `Document` gets an optional `expiryDate` with a simple expiring/expired badge in the UI. No automated reminder emails in v1.
- **Deletion.** Soft delete only (`deletedAt`) — the underlying S3 object is kept for audit, consistent with the ledger system's "void, don't delete" philosophy for non-draft records.

## UI placement

No global documents list/page. Documents are only reachable from within an existing Building or Tenant view:

1. **Remove the dead nav link and dashboard card** — delete the "Documents" entry from `DashboardSidebar.tsx:15` and the "Documents" card from `app/dashboard/page.tsx:348-366`, since there's no global page for them to point to and they currently 404.
2. **Tenant detail page** (`TenantDetailClient.tsx`) — a new "Documents" card alongside the existing Contract History / Ledger / Invoices cards, scoped to that tenant. Shows *all* of that tenant's documents (any category, including ones with no `contractId`); documents that do have a `contractId` can show which contract period they belong to.
3. **Contracts section of the Edit Tenant form** (screenshot reviewed — `TenantForm.tsx`'s Contracts block: Start Date / End Date / Rent Amount / Deposit / Notes / +Add Contract) — each contract row gets an "Attach lease PDF" control next to Notes. Uploading there sets `parentType='TENANT'`, `parentId=<tenantId>`, `category='lease_contract'`, `contractId=<that row's id>` automatically, using the same presigned-upload flow as everywhere else.
   - **Scope limit**: this only works once the tenant already exists (`tenantId` is required as `parentId`). For a brand-new tenant being created for the first time, contract rows can be added without an attachment in that same form; the attach control appears once Edit Tenant is reopened on the saved record.
4. **Building cards** (`app/dashboard/buildings/page.tsx`) — a "Documents" button per building card opening a modal with the same list/upload components (buildings have no dedicated detail page today, so no new route is introduced there).

## Data model

**`api/src/lib/dynamodb.ts`**: add `DOCUMENT = 'DOCUMENT'` to the `EntityType` enum (the only place entity types are registered per `CLAUDE.md`).

**New model `api/src/models/document.ts`**, following the `createTenant`/`createBuilding` factory pattern:

```ts
export type DocumentParentType = 'BUILDING' | 'TENANT';
export type DocumentCategory = 'sec_certificate' | 'business_permit' | 'lease_contract' | 'government_id' | 'other';

export interface Document extends BaseEntity {
  [key: string]: any;
  id: string;
  ownerId: string;
  parentType: DocumentParentType;
  parentId: string;          // buildingId or tenantId
  contractId?: string;       // optional — references a TenantContract.id when parentType='TENANT'
  category: DocumentCategory;
  fileName: string;          // original filename
  s3Key: string;
  mimeType: string;
  fileSize: number;
  expiryDate?: string;
  notes?: string;
  deletedAt?: string;
}
```

PK/SK/GSI1 — mirrors the "GSI1 = list by parent, sorted/filtered by natural key" convention already used for Invoice's `GSI1PK: 'TENANT#'+tenantId`, but keeps `GSI1PK` owner-scoped like every other entity so ownership checks stay consistent:

```
PK:      DOCUMENT#<id>
SK:      DOCUMENT#<id>
GSI1PK:  USER#<ownerId>
GSI1SK:  DOCUMENT#<parentType>#<parentId>#<id>
```

- List by parent (the only listing this feature needs): `GSI1PK = USER#<ownerId>`, `begins_with(GSI1SK, 'DOCUMENT#BUILDING#<buildingId>#')` or `'DOCUMENT#TENANT#<tenantId>#'`.
- Filtering by `contractId` or `category` happens in JS after the parent-scoped fetch, same as `TenantRepository.listByBuilding` filters `buildingId` in memory today.
- The owner-scoped `GSI1PK` also means an "all my documents" query is possible later (`begins_with(GSI1SK, 'DOCUMENT#')`) without any schema change — just not built or exposed via a route in this v1.

**`api/src/models/tenant.ts`**: add `id?: string` to `TenantContract` (line 4-10). Not generated by the backend — the frontend assigns a `uuidv4()` when a contract row is added in the form, and it's persisted as-is through the existing generic `update()`/`addContract()` path (no repository changes needed beyond accepting the extra field, which the dynamic update builder already handles generically).

## Backend

**Upload sequence — confirmed 3-step orchestration, decided over the base64 alternative.** Base64 (as used for property images) lets the file bytes and metadata travel in a single `POST` because `images: string[]` is embedded directly on the `Property` record — one write, one entity. `Document` is its own entity, so that shortcut doesn't apply here regardless of encoding; the real tradeoff was file-size risk (API Gateway's payload limit plus ~33% base64 inflation vs. presigned URLs' effectively unlimited size) against orchestration complexity. Presigned wins because documents are scanned multi-page PDFs, which can plausibly exceed what base64-through-Lambda could safely carry. The sequence, only 2 of 3 steps of which hit the Lambda:

1. `POST /api/documents/upload-url` (Lambda) — metadata only, no file bytes. Returns `{ documentId, uploadUrl, key }`. No DynamoDB write yet.
2. Browser `PUT`s the raw file bytes straight to `uploadUrl` — goes directly to the S3 host, bypasses API Gateway/Lambda entirely.
3. `POST /api/documents` (Lambda) — creates the actual `Document` record referencing the `key` from step 1.

Failure modes are both harmless/self-contained, so no compensating transaction is needed: if step 2 never happens, step 1's presigned URL just expires unused (no DB row was ever created). If step 3 never happens after a successful step 2, the file sits in S3 with no matching `Document` record — an orphaned object, not a data-integrity problem, since nothing ever references it; acceptable to leave for now (the existing S3 lifecycle rule already aborts incomplete multipart uploads after 7 days, `infra/modules/s3/main.tf:52-80`, though that specific rule doesn't cover this case — a periodic cleanup of orphaned keys could be a future enhancement, not needed for v1).

**`api/src/lib/s3.ts`**:
- Generalize `getPresignedUploadUrl(fileName, contentType, propertyId?)` to accept a generic `folderPrefix` (e.g. `buildings/<id>/documents` or `tenants/<id>/documents`) instead of assuming `properties/`.
- Add `validateDocumentFile(fileName, contentType, size)`: allow `application/pdf, image/jpeg, image/png, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`; max size ~15MB (documents are scanned certs/contracts, larger than listing photos).
- Reuse `getPresignedViewUrl`/`deleteObject` as-is — already generic.

**New `api/src/repositories/documentRepository.ts`** — copy the standard shape from `tenantRepository.ts`: `create`, `findById`, `update` (verbatim dynamic builder per `CLAUDE.md`), soft `delete` (`update(id, { deletedAt: now })`), plus `listByParent(ownerId, parentType, parentId)` using the GSI1 query above.

**New `api/src/handlers/documents/handler.ts`** — static-method class, same shape as `tenants/handler.ts`:
- `getUserId(event)` / `getDocumentId(event)` helpers (copy pattern).
- `POST /api/documents/upload-url` — body `{ parentType, parentId, fileName, contentType }`. Verifies the parent (building or tenant) exists and `ownerId === userId` (reuse `BuildingRepository.findById`/`TenantRepository.findById`), calls `S3Service.validateDocumentFile` (content-type/extension only — size isn't known yet, same limitation as today's image flow) then `s3Service.getPresignedUploadUrl(fileName, contentType, folderPrefix)`. Returns `{ documentId: uuidv4(), uploadUrl, key }` — the id is generated here so the client can pass it straight back on confirm.
- `POST /api/documents` — body `{ id, parentType, parentId, contractId?, category, fileName, s3Key, mimeType, fileSize, expiryDate?, notes? }`. Re-validates `fileSize` against the max (this is the point where size actually gets enforced, since it wasn't known at URL-issuance time), verifies parent ownership again, creates the `Document` record via `DocumentRepository.create` (using the pre-generated `id`).
- `GET /api/documents?parentType=&parentId=` — both params required; ownership-checks the parent, calls `listByParent`.
- `GET /api/documents/{id}/view-url` — loads document, checks `document.ownerId === userId && !document.deletedAt`, returns `s3Service.getPresignedViewUrl(document.s3Key)`.
- `PUT /api/documents/{id}` — metadata-only update (category, notes, expiryDate, fileName, contractId).
- `DELETE /api/documents/{id}` — soft delete only (`deletedAt`); does **not** delete the S3 object.

**`api/src/index.ts`** — add a routing branch for `/api/documents`, above the final `propertyHandler` fallthrough per the existing pattern.

**Three route-config files** (per `CLAUDE.md`'s explicit callout — the #1 gotcha in this repo — all three must be updated together):
1. `api/serverless.yml` — `- http:` blocks for `POST /api/documents/upload-url`, `POST /api/documents`, `GET /api/documents`, `GET /api/documents/{id}/view-url`, `PUT /api/documents/{id}`, `DELETE /api/documents/{id}`, each with `cors: true` + the request authorizer.
2. `infra/modules/api/routes.tf` — matching `aws_apigatewayv2_route` blocks, `authorization_type = "JWT"` + the cognito authorizer, for real deployment.
3. `api/local-server.ts` — matching `app.all('/api/documents...', ...)` registrations.

No IAM changes needed — the Lambda role already has `s3:PutObject/GetObject/DeleteObject/ListBucket` on the shared bucket (`infra/modules/s3/main.tf:85-110`) and generic DynamoDB permissions on `Resource: "*"`.

## Frontend

**`lynxbox-ph/src/features/documents/`** (new feature folder, following the `invoicing/types.ts` single-contract-file convention):
- `types.ts` — `Document`, `DocumentCategory`, `DocumentParentType` mirroring the backend model.
- Service `src/services/documentService.ts` — singleton class per `CLAUDE.md` pattern: `getUploadUrl(parentType, parentId, file)`, `confirmUpload(payload)`, `listDocuments(parentType, parentId)`, `getViewUrl(id)`, `updateDocument(id, data)`, `deleteDocument(id)`.

**Upload flow (component-level)**:
1. User picks a file → client-side validate type/size (mirror `validateImageFile` pattern in `lib/utils.ts`, new `validateDocumentFile`).
2. `documentService.getUploadUrl(...)` → `{ documentId, uploadUrl, key }`.
3. Raw `fetch`/`XMLHttpRequest` `PUT` of the file bytes directly to `uploadUrl` (mirror the existing-but-unused `propertyService.uploadPropertyImage`'s XHR-with-progress approach, `propertyService.ts:422-464`).
4. `documentService.confirmUpload({ id: documentId, key, fileSize: file.size, mimeType: file.type, category, contractId?, expiryDate?, notes? })` to create the metadata record.

**Components** (`features/documents/components/`):
- `DocumentUploadModal.tsx` — generic modal: file picker, category select, optional expiry date, optional notes, progress bar during the direct-to-S3 PUT. Reusable across building/tenant/contract-row contexts (parametrized by `parentType`/`parentId`/`contractId?`), same spirit as `PaymentModal` being generic/reusable.
- `DocumentList.tsx` — table/list: filename, category badge, upload date, expiry badge (red "Expired" / amber "Expiring soon" within e.g. 30 days / none), "View" (opens `getViewUrl` result in a new tab) and "Delete" actions.

**Pages/wiring**:
- `DashboardSidebar.tsx` — remove the "Documents" nav entry (line 15).
- `app/dashboard/page.tsx` — remove the "Documents" dashboard card (lines 348-366).
- `TenantDetailClient.tsx` — new "Documents" card alongside Contract History / Ledger / Invoices, using `DocumentList` scoped to `parentType="TENANT"`.
- `TenantForm.tsx`'s Contracts block — an "Attach lease PDF" control per contract row (client-generates `TenantContract.id` on `+Add Contract` if not already set), wired to the same upload flow with `contractId` set.
- `app/dashboard/buildings/page.tsx` — a "Documents" button per building card opening a modal wrapping `DocumentList`/`DocumentUploadModal` with `parentType="BUILDING"`.

## Verification

1. `npm run dev` in `api/` (local-server + serverless-offline) and `lynxbox-ph/` (Next.js dev server).
2. Confirm all three route files were updated by hitting each new endpoint locally through the Express wrapper (`local-server.ts`) before touching Terraform.
3. Confirm the sidebar no longer shows "Documents" and the dashboard no longer shows the "Documents" card.
4. From a Tenant detail page: upload a PDF via the Documents card, confirm the presigned PUT succeeds directly against S3 (check network tab — request goes to the S3 host, not `/api/...`), confirm the metadata record appears in the list, confirm "View" opens a working presigned GET URL, confirm "Delete" soft-removes it without deleting the S3 object.
5. From the Edit Tenant form's Contracts section: add a contract row, attach a lease PDF, confirm it's tagged with the correct `contractId` and shows up both on that row and in the tenant's general Documents card.
6. Repeat upload/view/delete from a Building card's Documents modal.
7. Test the expiry badge (past date, within 30 days).
8. Test rejection paths: wrong file type, oversized file (both client-side pre-check and server-side re-check on confirm).
9. After local verification, run `infra/scripts/deploy-infra.ps1` (needs a live AWS SSO session) to apply the `routes.tf` changes to sandbox, then re-test the same flows against the deployed API to confirm the JWT authorizer is attached correctly (per the `CLAUDE.md` warning about routes missing from `routes.tf` falling through to `$default` with no auth).

## Deviations from plan

Everything above shipped as designed. These are the things that changed or were added during/after implementation — keep this section current rather than letting it drift:

- **Presigned view URLs now carry the original filename via `Content-Disposition`.** The plan correctly called for the S3 key to stay a UUID (never the original filename), but didn't specify how the UI would then show/download the right name. `S3Service.getPresignedUploadUrl` builds the key as `<folderPrefix>/<uuid>.<ext>`; `S3Service.getPresignedViewUrl(key, expiresIn, downloadFileName?)` now signs a `ResponseContentDisposition` header (via a new `buildContentDisposition()` helper — sanitizes CRLF/quotes, adds an RFC 5987 `filename*=UTF-8''...` fallback for non-ASCII names) into the URL when a filename is passed. `DocumentHandler.getViewUrl` always passes `document.fileName`. Without this, every view/download would show the UUID instead of e.g. `Lease-2026.pdf`.
- **Post-upload editing was added.** The plan's `PUT /api/documents/{id}` endpoint existed but nothing in the UI called it. Added `DocumentEditModal.tsx` (category/expiryDate/notes, same react-hook-form+zod pattern as `DocumentUploadModal`) wired to a new `onUpdate` callback on `DocumentList`.
- **All row actions across the app are icon buttons, not text buttons** — this went beyond just `DocumentList`. `TenantList.tsx`, `InvoiceList.tsx`, and the building cards in `app/dashboard/buildings/page.tsx` were also converted for consistency: `FiEye` (view), `FiEdit2` (edit), `FiTrash2` (delete), `FiSlash` (void — kept visually distinct from delete since it's a different operation). Pagination arrows and page-level buttons (Export CSV, +Add Building, Attach lease PDF) were left as text/existing style since they aren't per-row record actions.
- **`TenantContract.id` generation uses `crypto.randomUUID()`, not the `uuid` package.** The frontend (`lynxbox-ph/`) has no `uuid` dependency, so this uses the native browser API instead of adding one. The id is generated immediately when a new contract row is added via `+ Add Contract` (not lazily on first attach attempt) — legacy rows saved before this feature existed still have no `id` and the "Attach lease PDF" control is simply hidden for those rows, exactly as originally planned.
- **`useFieldArray({ name: 'contracts' })` in `TenantForm.tsx` uses `keyName: '_key'`.** React Hook Form's `useFieldArray` defaults to storing its own internal per-row key on a field called `id` — which would silently collide with/overwrite our actual `TenantContract.id` domain field. Renaming RHF's internal key to `_key` was necessary to keep the two `id`s from clashing; not mentioned in the original plan because the collision only surfaces once `TenantContract` gains a real `id` field.
- **Building Documents modal widened, `DocumentList` given explicit column sizing.** The modal was originally `size="xl"`, which squished the File column against Category/Uploaded/Expiry/Actions once real filenames (e.g. invoice-style names like `WRB-00076-INV-2026-09-0050.pdf`) were tested. Bumped to `size="3xl"`, and `DocumentList` now wraps its `Table` in a `TableContainer` (horizontal-scroll fallback) with `minW`/`maxW`/`wordBreak` on the File column and `whiteSpace="nowrap"` on the other columns so they don't get squeezed evenly.
