# Property Listing — Plan

Status: **implemented**. This doc is kept up to date, not just a historical spec — see each section's own notes for what changed and any tradeoffs accepted along the way. Read this before touching property image upload or the public property endpoints.

## Context

`Property` (`api/src/models/property.ts`) is the public, publicly-browsable marketplace listing entity — title/price/photos/location, its own `/api/public/properties` API — described in `CLAUDE.md`'s Pricing & Plan Limits section as the product's marketing/vacancy-advertising pillar, separate from Building/Tenant/Invoice. This doc covers a series of problems found and fixed while working through this feature: how property images actually get from the browser to S3, how the public listing endpoints exposed owners' phone/email to scraping, several property form/field UX bugs, a human-friendly `propertyNumber`, and a listing-visibility enforcement gap across the public endpoints.

## Image upload — direct-to-S3, not base64-through-Lambda

### What was found

- `PropertyForm.tsx` converted every selected image to base64 and embedded it in the create/update JSON body, sent through API Gateway → Lambda. For many/large photos this risks API Gateway's payload limit plus the ~33% base64 size inflation — the same tradeoff `docs/Documents-Feature-Plan.md` weighed when it chose presigned-URL upload for documents instead of copying this pattern.
- Presigned-URL scaffolding already existed in the code (`S3Service.getPresignedUploadUrl`, `PropertyHandler.getPresignedUploadUrl`, `propertyService.uploadPropertyImage`) but had **zero callers** — unused scaffolding, exactly as `Documents-Feature-Plan.md` had already noted when it was written. It also had a latent bug: `propertyService`'s presigned-upload helpers never unwrapped the API's `{ success, data }` response envelope, so `uploadUrl`/`key` would have come back `undefined` the moment something actually called it.
- Further dead code existed alongside the live base64 path: `PropertyHandler.handleMultipartPropertyCreation`, `handleBase64Images`, and a second, separate legacy multipart endpoint `POST /api/properties/{id}/images` (`PropertyHandler.uploadPropertyImage`). Confirmed via grep across both `api/` and `lynxbox-ph/` — no live caller anywhere for any of these.
- `PropertyHandler.getPresignedUploadUrl` required the target property to already exist in DynamoDB (`PropertyRepository.findById` 404s if not found) — which blocks the one case that matters most: a **brand-new** listing has no id yet at the point its first photos are being picked.
- Property images get server-side watermarking + resizing by default (`ImageProcessingService.processForPropertyUpload`, gated by `WATERMARK_ENABLED` which defaults to on) inside the old base64 path's `S3Service.uploadImage()`. Naively switching to a raw presigned PUT would have silently dropped this — the file bytes go straight from the browser to S3 and never touch Lambda, so there's no point left in the old flow where processing could happen.

### What changed

- The client now generates the property's id **upfront**, client-side (`crypto.randomUUID()` — same established pattern as `TenantContract.id`, no new `uuid` frontend dependency), the moment the create/edit form mounts, and reuses it for the form's whole lifetime. This is what makes uploading before the property record exists possible at all.
- Upload is now a 3-step flow per image (mirrors Documents' presigned pattern, with one extra step Documents doesn't need):
  1. `GET /api/properties/{id}/images/upload-url` — returns a presigned S3 PUT URL + key. No longer requires the property to already exist; ownership is only checked when it does (a new listing can't be ownership-checked against a record that doesn't exist yet — same accepted-risk shape as Documents' "orphaned S3 object is not a data-integrity problem" reasoning).
  2. Browser `PUT`s the raw file bytes straight to S3 — bypasses API Gateway/Lambda entirely.
  3. **`POST /api/properties/{id}/images/confirm`** (new) — downloads that one just-uploaded object back out of S3, runs it through the same watermark/resize pipeline the old base64 path used (`S3Service.processUploadedImage`, wrapping `ImageProcessingService.processForPropertyUpload`), and overwrites it in place. This is the step Documents never needed (it doesn't process uploaded files at all) — it's what lets watermarking keep working while the raw bytes still never pass through API Gateway's request/response body.
  4. `POST`/`PUT /api/properties` (create/update) now just take `images: string[]` — plain, already-uploaded S3 keys. No `base64Images` anywhere anymore, front or back end.
- Deleted as dead code: `handleMultipartPropertyCreation`, `handleBase64Images`, the legacy `uploadPropertyImage` handler, and its `POST /api/properties/{id}/images` route in all three route-config files (see `CLAUDE.md`'s callout on why all three — `serverless.yml`, `infra/modules/api/routes.tf`, `local-server.ts` — always need to move together).
- `PropertyForm.tsx`'s image state was refactored from three separately-tracked arrays (`selectedImages: File[]`, `imagePreviews: string[]`, `removedImages: string[]`) into one `ImageItem[]` (`{ kind: 'existing'; key } | { kind: 'new'; file; previewUrl }`), using synchronous `URL.createObjectURL()` previews instead of async `FileReader.readAsDataURL()`. This wasn't just cleanup: the old code's `removeImage` decided "is this a new or existing image?" by comparing the clicked index against `selectedImages.length`, silently assuming new images sit at the *front* of `imagePreviews` — but they're actually appended at the *end*. In edit mode, with existing images already loaded, removing a newly-added image could misclassify it as existing (pushing its data-URL into the field meant for S3 keys to delete) while leaving the actual `File` untouched in `selectedImages` — so the "removed" image would silently reappear in the saved property. Discriminating by the item's own tagged `kind` instead of position removes the whole bug class.
- The upload-progress bar in `PropertyForm.tsx` existed in the JSX before this change but nothing ever called `setUploadProgress` with a real value — it's now wired to real per-file XHR progress during step 2 of the upload above.

### Accepted limitation

`getPresignedUploadUrl` and `confirmImageUpload` both skip ownership verification when the target property id doesn't exist yet in DynamoDB — there's nothing to check ownership against. Worst case, an authenticated user could cause a watermarked, orphaned image to sit under an S3 key prefix they don't otherwise control, never linked to any real property unless they go on to actually complete the create call themselves. Same risk shape Documents already accepted for its own orphaned-object case.

## Public listing contact-info scraping protection

### What was found

`GET /api/public/properties/{id}` — and, worse, the bulk `GET /api/public/properties` and `GET /api/public/search` — returned the **entire** `Property` record verbatim to any unauthenticated caller, including the real `contactInfo.phone` and `contactInfo.email` in plaintext JSON. This is scrapeable directly via the API with no need to even render the page (`view-source` was never the real threat model here), and the bulk list/search endpoints let a scraper harvest every listing's contact info in one paginated sweep rather than one at a time.

### What changed

- **`api/src/lib/contactMasking.ts`** (new) — `maskPhone`, `maskEmail`, `maskContactInfo`. Phone keeps the first 3 and last 2 digits, masking everything else in between while leaving existing separators/formatting alone (e.g. `+63 917 123 4567` → `+63 9** *** **67`). Email keeps the first character of the local part plus the full domain (`john.doe@example.com` → `j*******@example.com`) — domain stays visible so a masked listing still reads as a legitimate business address.
- Applied in `getPublicProperty`, `listPublicProperties`, and `searchPublicProperties` — these now only ever return the masked form. The owner-scoped, authenticated equivalents (`getProperty`, `listProperties`, `searchProperties`) are untouched — an owner viewing their own listings still sees their own real contact info.
- New **`GET /api/public/properties/{id}/contact`** (no auth) hands back the real `{ phone, email }`, but only for one listing at a time — never bundled into a list.
- Frontend (`PropertyDetailClient.tsx`): "Call Now" / "Send Email" are themselves the reveal action — clicking either fetches the real contact info (if not already fetched this visit), immediately opens `tel:`/`mailto:` with the real value, and swaps the sidebar's masked phone/email display for the real one. The fetched result is cached in component state so a second click on either button doesn't hit the API again.

### Decision made & accepted limitation

Chose **click-to-reveal with no login required**, over gating the reveal endpoint behind authentication or replacing direct contact entirely with a server-relayed inquiry form — this keeps the anonymous-visitor lead funnel frictionless, at the cost of weaker protection than the other two options would have given.

**No rate limiting on the reveal endpoint** — this repo has no rate-limiting infrastructure anywhere yet (no API Gateway usage plans, no per-IP throttling layer), so this wasn't added just for this endpoint. A scripted scraper can still work around the split by calling `/contact` once per known listing id; this raises the cost of scraping (N calls instead of 1, each yielding only one listing instead of a whole page) but does not make it impossible for a determined actor. If this turns out to matter in practice, the two follow-up options are: gate `/contact` behind login (real friction, but loses anonymous leads — the tradeoff this decision explicitly avoided), or add IP-based throttling (new infrastructure for this repo, not a small add).

## Property form field fixes (Area, Floor, Location)

### Area — decimal input was silently blocked

**What was found:** the Area (m²) `NumberInput` fed `parseFloat(value) || 0` straight back into its own controlled `value` prop on every keystroke. Typing `12.` parses to the number `12` (no decimal marker), which then re-renders the input — with `precision={2}` set — as `12.00`, wiping the decimal point before a digit after it could ever be typed. The up/down steppers worked fine (they never pass through that half-typed intermediate string), which was the tell that this was a controlled-input formatting fight, not a validation limit — the zod schema (`area: z.number().min(0, ...)`) never restricted decimals in the first place.

**What changed:** the field's displayed text is now tracked in its own `areaInputValue` state, decoupled from the numeric value hand fed to react-hook-form — `NumberInput`'s `value` prop follows `areaInputValue` (exactly what Chakra reports back, unmodified) while `onChange` separately parses and forwards a number to the form. This is the standard fix for this class of Chakra `NumberInput` bug: never feed a re-derived/reformatted number back in as the controlled value while the user is mid-keystroke.

### Floor — relabeled to mean "which floor", not floor count

**What was found:** the field was labeled "Floors" and read like a count of how many floors the building has, when what it actually means for a single listing is which floor level the unit is on.

**What changed:** relabeled to "Floor" in `PropertyForm.tsx`, with helper text ("Which floor the property is on (0 = ground floor)") clarifying the meaning — no schema or validation change, `features.floors` is still a plain non-negative number under the hood. Display everywhere it's shown now goes through a new `formatFloor()` helper (`lynxbox-ph/src/lib/utils.ts`): `0` → "Ground", `1` → "1st", `2` → "2nd", `3` → "3rd", `4`+ → "4th" etc., with the 11th/12th/13th English-ordinal exception handled correctly. Wired into both `PropertyDetail.tsx` (dashboard/owner view, "Ground Floor" / "3rd Floor") and `PropertyDetailClient.tsx` (public listing page).

### Location — Province/City are now cascading selects backed by real PH data

**What was found:** `location.city` and `location.province` were free-text `Input` fields — no canonical list backing them, so the same city could end up stored under any number of spelling/casing variants across listings (`"QC"` vs `"Quezon City"`, etc.), which would silently fragment anything that filters or groups by city later.

**What changed:** added `lynxbox-ph/src/data/philippineLocations.ts` — 82 provinces and 1,632 cities/municipalities (`PH_PROVINCES: string[]`, `PH_CITIES: { name, province }[]`, `getCitiesForProvince()`), sourced from PSGC (Philippine Standard Geographic Code) data via the `ph-locations` npm package and copied in as a static data file rather than kept as a runtime dependency — consistent with this repo's preference for self-contained data over small utility packages (verified the package's contents directly via `npm pack` before copying, no arbitrary/unverified data pulled in). `PropertyForm.tsx`'s Province/City fields became a cascading `Select` pair: City is disabled with a "Select a province first" placeholder until a Province is chosen, then lists only that province's cities/municipalities; changing Province clears whatever City was selected, since it may no longer be valid. An existing property whose stored city/province doesn't exactly match the canonical list (typos, legacy free-text data) still displays and stays selectable — added as an extra option rather than silently dropped or overwritten, same defensive pattern used elsewhere in this doc for not-yet-existing/mismatched data.

**Known data quirk:** a handful of municipality names in the source dataset carry minor punctuation differences from official spelling (e.g. `"Tawi Tawi"` rather than `"Tawi-Tawi"`, `"Hinoba An"` rather than `"Hinoba-an"`) — cosmetic only, not hand-corrected across all ~1,600 entries; worth fixing individually if a specific listing needs the exact official spelling.

## Property Number — human-friendly identifier

### What was found

Both the owner-facing (`PropertyDetail.tsx`) and public (`PropertyDetailClient.tsx`) detail pages showed the raw UUID as "Property ID" — including to anonymous site visitors, in a spot right next to the listing's other reference info. A GUID isn't something anyone would reference verbally (e.g. over a phone call about a listing), and it doesn't match this app's own precedent: Invoice already has a human-friendly `invoiceNumber` (`INV-<billingMonth>-<seq>`), generated by reading the existing count for that owner+month and using `count + 1`.

### What changed

- **`Property.propertyNumber: string`** (`api/src/models/property.ts`) — assigned once at creation, immutable afterward (protected the same way `id`/`ownerId`/`createdAt` already are in `updateProperty`'s field-stripping). Format: `LB-00000123` (8-digit zero-padded sequence).
- **Platform-wide atomic counter, not "count existing + 1".** Invoice's generation approach (list everything for that owner+month, take `length + 1`) is fine because it's scoped per-owner — but Property listings are public across every owner on the platform, so the numbers need to be globally unique, and re-listing-then-counting isn't safe against concurrent creates from different owners. `PropertyRepository.getNextPropertyNumber()` instead reuses the atomic-`ADD` counter pattern already established in `AccountRepository.incrementMonthlyInvoiceCount` — a single `UpdateCommand` with `ADD sequence :one` against one singleton row (`PK/SK: COUNTER#PROPERTY_NUMBER`), atomic without needing a transaction. Added `EntityType.COUNTER` to register this new kind of row (`api/src/lib/dynamodb.ts`).
- **Existing properties get backfilled, not lazily assigned on read.** `api/src/scripts/backfillPropertyNumbers.ts` (run via `npm run properties:backfill-numbers`, same shape as the existing `usage:backfill` script) scans for properties missing a `propertyNumber`, assigns them in `createdAt` order by drawing from the same counter new creates use, and is safe to re-run (`ConditionExpression: attribute_not_exists(propertyNumber)` skips anything already assigned). Chosen over lazy assignment-on-first-read specifically to avoid a "concurrent reads race to assign different numbers" class of bug.
- Both detail pages now show **"Property Number"**: `property.propertyNumber` (falling back to `property.id` if somehow absent). Naming settled on "Number" over "Code" to match the existing "Invoice Number" convention — "Code" reads more like something you'd type into a box (promo code, referral code), not a reference identifier for a specific record.

### Scope note — display-only, not a URL/routing change

This only replaces what's *shown*; the public URL (`/properties/detail?id=<uuid>` / `/properties/[id]`) still resolves by the raw UUID, same as before. Making the URL itself use `LB-00000123` would need a code→property lookup, which isn't free with this table's single-GSI design (GSI1 is already committed to owner-scoped queries) — the clean way would be a second lightweight pointer item per property (`PK: 'PROPERTY_NUMBER#<number>'` → `{ propertyId }`), not a new GSI. Deliberately left out of this round; worth doing later only if prettier/shareable URLs turn out to matter.

## Listing visibility enforcement — a real gap closed, plus a Renew action

### What was found

Tracing through "how does listing visibility duration actually work end to end" surfaced a real, pre-existing bug: three separate public endpoints only checked `property.status !== 'available'` and never checked expiry or the Payments plan's past-due suspension at all — `getPublicProperty` (the listing detail page itself), `getPublicPresignedViewUrl` (public image URLs), and `getPublicContactInfo` (the contact-reveal endpoint from this doc's scraping-protection section). So an expired or past-due-suspended listing correctly disappeared from browse/search results, but was still fully reachable — detail page, images, even contact info — by anyone with the direct/bookmarked link.

Separately: **the manual "renew an expired listing" mechanism (`PUT /api/properties/{id}` with `renew: true`) existed entirely on the backend with no UI anywhere to trigger it.** No button, no `renew` field even declared on the frontend's `PropertyUpdate` type. Every plan's listings — not just Free's, all three finite-duration tiers use the identical mechanism — would go dark after their window with literally no way for the owner to bring them back except calling the API directly.

### What changed

- All three endpoints above now also check `isListingCurrentlyVisible()` (exported from `propertyRepository.ts` rather than duplicating the expiry/suspension logic) — an expired or suspended listing now consistently 404s everywhere, not just in list/search. `getStaticListingImageUrl` was deliberately left alone — it's explicitly designed to skip DynamoDB entirely for embeddable widgets, so adding a lookup there would defeat its purpose.
- Added a **Renew action**: `DashboardPropertyList.tsx` (both card and table view) and `PropertyDetail.tsx` now show a Renew button (`RepeatIcon`) whenever `isPropertyExpired(property.expiresAt)` is true, calling `propertyService.updateProperty(id, { renew: true })`. Added `renew?: boolean` to the frontend `PropertyUpdate` type (was simply missing) and a shared `isPropertyExpired()` helper (`lynxbox-ph/src/lib/utils.ts`, mirrors the same check the backend already had).
- Added an **"Expired" badge** next to the status badge in both components, and `expiresAt`/`listingSuspended` to the frontend `Property` type (present in the wire payload all along, just never typed) — so an owner can actually see *why* a listing isn't showing up, not just notice it silently vanished.

### A related, real bug found and fixed the same pass: editing an unlisted property

`PropertyForm.tsx`'s Property Status field is (was) `z.enum(['available', 'rented', 'sold', 'maintenance'])`, with a `<Select>` offering exactly those four options — but `reconcilePropertyListingsForPlan()` (see docs/Pricing-Strategy-Plan.md) can set a fifth value, `'unlisted'`, that was never in the enum or the dropdown at all. Since it's a plain native `<select>`, opening the edit form for an unlisted property silently fell back to displaying "Available" (the first option) — and saving without deliberately touching Status would submit `status: 'available'`, silently undoing the plan-limit enforcement the moment the owner edited anything else.

Fixed by widening `PropertyStatus`/the zod enum to include `'unlisted'`, but rendering `<option value="unlisted">` **only when the property's current status already is `'unlisted'`** — so it displays correctly and can be freely switched *away from* (that's the actual re-listing mechanism the billing page's own copy already promises: "you can choose which to re-list"), but is never offered as something to manually switch *into*. An explanatory line appears next to the dropdown when this applies, telling the owner why and what to do.

## Other changes made this session

- **Description character counter** — `PropertyForm.tsx`'s Description field now shows a live `n/1000` counter (red past the limit) next to the existing validation error, and the `Textarea` got `maxLength={1000}` so it can't be typed past the zod schema's existing `.max(1000, ...)` limit in the first place. Purely a UX addition, no backend change (the 1000-char limit already existed and was already enforced by validation — this just makes it visible while typing).

## Files touched this session

- `api/src/lib/contactMasking.ts` (new)
- `api/src/lib/s3.ts` — added `processUploadedImage` + `streamToBuffer`
- `api/src/lib/dynamodb.ts` — added `EntityType.COUNTER`
- `api/src/models/property.ts` — added `propertyNumber`, `createProperty()` now takes it as a second param
- `api/src/repositories/propertyRepository.ts` — added `getNextPropertyNumber()`, wired into `create()`
- `api/src/scripts/backfillPropertyNumbers.ts` (new)
- `api/package.json` — added `properties:backfill-numbers` script
- `api/src/handlers/properties/handler.ts` — removed base64/multipart paths, added `confirmImageUpload` + `getPublicContactInfo`, masked the three public read endpoints, relaxed `getPresignedUploadUrl`'s existence check, protected `propertyNumber` from being overwritten via update, added `isListingCurrentlyVisible` check to `getPublicProperty`/`getPublicPresignedViewUrl`/`getPublicContactInfo`, narrowed the active-listing-count definition (see docs/Pricing-Strategy-Plan.md)
- `api/serverless.yml`, `infra/modules/api/routes.tf`, `api/local-server.ts` — route changes for the image-upload and contact-scraping features above
- `api/src/repositories/propertyRepository.ts` — exported `isListingCurrentlyVisible`, added `isPropertyExpired`
- `api/src/lib/reconcilePropertyListings.ts`, `api/src/handlers/billing/handler.ts`, `api/src/repositories/platformAdminRepository.ts` — aligned to the same narrowed active-listing-count definition
- `lynxbox-ph/src/services/propertyService.ts` — dropped `base64Images` from types, fixed the presigned-upload envelope-unwrap bug, added `confirmImageUpload`/`getPublicPropertyContact`, added `propertyNumber`/`expiresAt`/`listingSuspended`, added `renew?: boolean` to `PropertyUpdate`, widened `PropertyStatus` to include `'unlisted'`
- `lynxbox-ph/src/data/philippineLocations.ts` (new) — PH provinces/cities static data
- `lynxbox-ph/src/components/PropertyForm.tsx` — image-state refactor, real upload flow, description character counter, area decimal-input fix, floor relabel, province/city cascading selects, unlisted-status dropdown fix
- `lynxbox-ph/src/app/properties/[id]/PropertyDetailClient.tsx` — click-to-reveal contact flow, floor ordinal display, Property Number display
- `lynxbox-ph/src/components/PropertyDetail.tsx` — floor ordinal display, Property Number display, Renew action, Expired badge
- `lynxbox-ph/src/components/DashboardPropertyList.tsx` — Renew action (card + table view), Expired badge
- `lynxbox-ph/src/app/dashboard/page.tsx` — aligned the "Active Listings" stat card to the same narrowed definition, so it never disagrees with the "X of Y used" text next to it
- `lynxbox-ph/src/lib/utils.ts` — removed now-unused `convertFileToBase64`/`extractBase64Data`, added `formatFloor()`, added `isPropertyExpired()`
- `docs/Documents-Feature-Plan.md` — added a note pointing at this doc where it previously described the property base64 flow as still-live
