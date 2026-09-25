# Map-Based Property Search — Plan

Status: **planned, not implemented**.

## Context

"Map-based property search" was promised in homepage/landlord/realtor marketing copy but never built — that copy has since been removed. This is a **from-zero build**, not "wire up existing data": `PropertyLocation.coordinates?: {lat, lng}` already exists on the `Property` model (`api/src/models/property.ts:14-22`) and even has a stub, currently-unused `optional()` entry in `PropertyForm.tsx`'s zod schema and in `propertyService.ts`'s frontend type — but nothing anywhere ever populates it. Every existing listing's coordinates are `undefined` today, no map library exists in the frontend, and no bounds-based query exists in the backend.

Three pieces need to land together for this to be usable at all:
1. **Capturing coordinates** — geocode server-side at create/update time, plus a one-time backfill for existing listings.
2. **Map rendering** on the public listing pages — no map library exists in this codebase yet.
3. **Bounds-based filtering** ("search this area") — reusing the existing JS-side post-fetch filtering convention (`PropertyRepository.filter()`), not new query infrastructure.

This plan covers all three, weighed against `docs/Property-Listing-Plan.md`'s and `docs/Pricing-Strategy-Plan.md`'s existing conventions for the `Property` entity. Two decisions below were confirmed directly rather than assumed: geocoding provider is **Nominatim/OpenStreetMap**, and coordinate capture is **optional/best-effort** (never blocks listing creation).

## Key decisions

### 1. Geocoding provider: Nominatim (OpenStreetMap), not Google/Mapbox

| | Nominatim / OSM | Google Maps Geocoding API | Mapbox Geocoding API |
|---|---|---|---|
| Cost | Free | ~$5 / 1,000 requests (negligible here — under $1 total incl. backfill, at ~100-200 listings platform-wide) | Free tier is for **temporary** (non-persisted) lookups only; permanently storing results (our exact use case) requires a separate paid tier — poor fit |
| Setup | None — no API key, no billing account | Needs a Google Cloud billing account + API key + secret in `api/.env` and the deployed Lambda's env — new ops surface this repo doesn't have today | Similar API-key/billing setup, plus the storage-tier caveat above |
| PH address accuracy | Inconsistent — many addresses only resolve to city/province centroid, not exact building | Meaningfully better street-level accuracy for PH addresses | Comparable to Google, moot given the storage-tier issue |
| Fit with repo conventions | Matches existing self-contained/free-data preference (same reasoning as `philippineLocations.ts` being copied in as static data rather than a live dependency); pairs naturally with the Leaflet+OSM map tiles decision below (same data source, consistent attribution) | Would be the first paid third-party API dependency in this repo | Ruled out for this use case |
| Usage limits | 1 req/sec hard cap on the public endpoint, "reasonable use" expected (not bulk/systematic geocoding of a whole dataset for resale) — a non-issue for real-time single-listing geocoding at this volume; the backfill script must self-throttle | No hard rate limit at this spend level | N/A |

**Decision: Nominatim.** Accept the accuracy tradeoff (see the fallback chain in "Data model" below) rather than take on a paid API + billing account for a low-volume, non-precision-critical use case. This is a single function behind one interface (`geocodeAddress()`) — cheap to swap to Google later if accuracy actually becomes a real complaint, without touching any other code.

### 2. Coordinate capture is optional/best-effort, never blocking

Geocoding runs automatically, server-side, invisible to the property owner (no new required form field). A network failure, timeout, or unresolvable address leaves `coordinates` absent — the listing is still created/updated successfully, still shows normally in list view, search, and its detail page; it simply won't appear in map/bounds-filtered results. This matches the repo's existing "fire-and-forget, never fail the primary write" convention (e.g. `AccountRepository.incrementMonthlyInvoiceCount`).

The server is authoritative for coordinates — any client-supplied `location.coordinates` is stripped from `PropertyInput`/update payloads (same treatment as `propertyNumber`/`ownerId`/`id`), so an owner can't spoof a listing's map position to game placement or misrepresent location.

### 3. Map library: Leaflet + react-leaflet + OpenStreetMap tiles

No map library exists in `lynxbox-ph/package.json` today. Leaflet+OSM is free, needs no API key, and pairs naturally with the Nominatim decision above (same underlying map data, consistent attribution story). Google Maps JS/Mapbox GL would each need their own API key/billing setup on top of what section 1 already avoided.

Real integration cost to plan for: this is a static-export app (`next.config.js`: `output: 'export'`). Leaflet touches `window` at import time, so the map component must be a client component loaded via `next/dynamic({ ssr: false })` — not just `'use client'` — or the static build breaks. Leaflet's default marker icon assets also don't resolve correctly under webpack/Next bundling by default (a well-known Leaflet+Next gotcha) — fixed by explicitly importing the icon URLs from `leaflet/dist/images/*` and reassigning `L.Icon.Default.mergeOptions(...)`, or using `L.divIcon` with an inline SVG instead. `next.config.js`'s `images.unoptimized: true` with no `remotePatterns` is a non-issue either way — Leaflet loads OSM tiles via its own internal `<img>` handling, not `next/image`.

### 4. Bounds filtering extends the existing search endpoint — no new route

`GET /api/public/search` (`PropertyHandler.searchPublicProperties`) already accepts `priceMin/priceMax`, `minArea/maxArea`, boolean amenity flags, etc., all threaded into `PropertyRepository.filter()`'s in-memory (post-`ScanCommand`) filtering. Bounds filtering (`swLat/swLng/neLat/neLng`) is added the same way — new optional query params, new in-memory predicate in `filter()` checking `property.location?.coordinates` falls within the box. **No new route** means no new entries needed in any of the three route-config files (`api/serverless.yml`, `infra/modules/api/routes.tf`, `api/local-server.ts`) — this feature adds zero new API Gateway routes, avoiding that whole class of "works locally, 401/404s in sandbox" bug this repo is prone to for genuinely new endpoints.

**Pipeline placement matters.** Confirmed exact existing order in `searchPublicProperties`: `PropertyRepository.filter()`'s `!deletedAt && isListingCurrentlyVisible(p)` check → `PropertyHandler.sortByPlacement()` (only when no explicit `sortBy`) → `maskContactInfo()` map over the results. The bounds predicate must sit in the *first* stage, alongside the existing visibility check inside `filter()` — never before it (would leak expired/suspended listings onto the map) and never after placement-sort/masking (would defeat both). Listings without coordinates are simply excluded whenever a bounds filter is present, the same way `isListingCurrentlyVisible` already excludes expired ones.

**Inherited, already-documented limitation applies here too.** `filter()`'s underlying `ScanCommand` is paginated via `ExclusiveStartKey`, and all in-memory filtering/sorting/slicing happens per-page before the raw scan cursor is handed back — this is the exact same "placement sort only reorders within whatever page was already fetched" gap already called out in `docs/Pricing-Strategy-Plan.md` (implementation note #16) for `sortByPlacement()`. A bounds filter has the identical shape: at today's volume (~100-200 listings) a single scan page covers everything, so it's a non-issue in practice; worth revisiting together with that doc's already-noted "placement-aware GSI" idea if/when the catalog grows past roughly a couple hundred listings and starts spanning multiple scan pages.

No plan-tier gating applies to map search itself — it's a buyer-facing marketplace feature, not an owner-subscription lever (mirrors how `Property` listing/search itself isn't gated by tier beyond the existing count/placement/duration axes already documented in `docs/Pricing-Strategy-Plan.md`). Standard/priority/featured placement still applies to whatever ranked list is shown alongside the map.

## Data model

No schema migration, no new `EntityType` (confirmed via full grep of `api/src/lib/dynamodb.ts`'s enum and the wider codebase — no `geohash`/`GSI2` work exists anywhere yet). `location.coordinates?: {lat, lng}` already exists on `Property`; this feature populates it.

**Unresolvable/incomplete address fallback chain** (used by both real-time create/update geocoding and the backfill script):
1. Try geocoding the full address (`location.address` + `location.city` + `location.province` + `", Philippines"`, country-biased query).
2. If that returns no match, fall back to geocoding just `location.city` + `location.province` (coarser, city/province-centroid pin) — still meaningfully useful for a map view at this stage, better than nothing.
3. If that also fails (bad data, network error, rate-limit, timeout), leave `coordinates` absent entirely. No error surfaced to the owner; the listing is simply excluded from map/bounds-filtered results, same as any other unmappable listing.

No `coordinatesPrecision` flag (exact vs. city-level) in this pass — an approximate pin looks identical to an exact one for now. Noted as a future enhancement, not built here, to keep scope matched to what's asked.

## Backend

- **New `api/src/lib/geocoding.ts`** — `geocodeAddress(address, city, province): Promise<{lat, lng} | null>`. Calls Nominatim's `/search` endpoint with `countrycodes=ph`, a required `User-Agent` header (Nominatim usage-policy requirement), and an `AbortController`-based timeout (~5s) so a slow/hanging call never stalls a create/update request. Implements the fallback chain above internally. Never throws — every failure path (timeout, no match, non-2xx, network error) resolves to `null`. No new dependency needed: `api/package.json` has no `axios`/`node-fetch`, and native `fetch` is available (confirmed via `@types/node`), so this uses global `fetch` directly.

- **`PropertyHandler.createProperty`** (`api/src/handlers/properties/handler.ts:17-90`) — after building `location`, call `geocodeAddress(...)` and attach the result to `location.coordinates` before `PropertyRepository.create()`. Strip any client-supplied `location.coordinates` from the incoming payload first (server is authoritative, per the key decision above).

- **`PropertyHandler.updateProperty`** (`:225-329`) — only re-geocode when `location.address`/`city`/`province` actually changed vs. the existing record (compare old vs. new before calling out), to avoid a redundant network call on every unrelated field edit. Same client-supplied-coordinates stripping as create.

- **`PropertyRepository.filter()`** (`api/src/repositories/propertyRepository.ts:405-615`) — add optional `swLat/swLng/neLat/neLng` filter params; new in-memory predicate (alongside the existing `priceMin/Max`, `minArea/maxArea`, etc. checks at `:475-599`) requiring `property.location?.coordinates` to exist and fall within the box.

- **`PropertyHandler.searchPublicProperties`** (`:529-595`) — parse the four new bbox query params the same way `priceMin`/`priceMax` etc. are already parsed (`:551-554` style), pass through to `filter()`. When a bbox is present, use a higher default `limit` (e.g. 200, vs. today's default 50) since a map viewport naturally narrows the candidate set. Everything downstream (`sortByPlacement`, `maskContactInfo`) is unchanged — bounds filtering is purely an additional predicate at the existing filtering stage.

- **New `api/src/scripts/backfillPropertyCoordinates.ts`** — mirrors `api/src/scripts/backfillPropertyNumbers.ts`'s exact shape: paginated `ScanCommand` with a `FilterExpression` targeting properties missing `location.coordinates`, geocode each candidate via `geocodeAddress()`, self-throttle with a ~1.1s delay between calls (respecting Nominatim's 1 req/sec policy — the real-time create/update path doesn't need this at current volume, but a backfill run processing every existing listing does), then a conditional `UpdateCommand` guarded by `attribute_not_exists(location.coordinates)` so it's safe to re-run. Wrap each item's geocode+update in try/catch so one bad address doesn't abort the whole run — matches this doc's "incomplete/unresolvable address" handling: log and move on, leave that row's coordinates absent, don't fail the batch. Add `properties:backfill-coordinates` to `api/package.json` scripts, same convention as `properties:backfill-numbers`.

- No IAM changes (Lambda already has outbound internet access for an HTTPS call; no new DynamoDB entity type means no new `dynamodb:*` permissions needed either — matches this repo's existing "new entity types need no IAM change" note). No CORS changes (extending existing endpoint's query params, not adding a header).

## Frontend

- **New dependencies**: `leaflet`, `react-leaflet`, `@types/leaflet` (dev). This is the one place this feature does add a real dependency — justified since no self-contained alternative exists for interactive map rendering (unlike the PH-locations data, which could be copied in as static data).

- **New `PropertyMapView.tsx`** — client-only component, loaded via `next/dynamic(() => import('./PropertyMapView'), { ssr: false })` from wherever it's used (required for the static-export build, not just a `'use client'` directive). Renders a Leaflet map with markers for the current result set; marker popups show title/price/thumbnail only — never phone/email (masking is already enforced server-side; the popup must not attempt to work around it) — clicking a marker navigates to that listing's existing detail page.

- **Public properties list/search page** (`lynxbox-ph/src/app/properties/page.tsx`) gets a List/Map view toggle. Map mode calls `propertyService.filterProperties()` (`lynxbox-ph/src/services/propertyService.ts:325-393`) with bbox params derived from `map.getBounds()`, debounced on the map's `moveend` event, reusing whatever other filters (price/type/amenities) are already active — same service method, just four more optional params appended the same way its existing `.forEach(v => searchParams.append(...))` pattern already handles arrays.

- **`PropertyDetailClient.tsx`** (`lynxbox-ph/src/app/properties/[id]/PropertyDetailClient.tsx`) — small embedded single-pin map near the existing address/`MapPin` display (`:257-260`), rendered only when `property.location.coordinates` is present; silently falls back to today's text-only address display when absent (no "map unavailable" messaging — matches this repo's established pattern of quietly omitting rather than erroring on missing optional data, e.g. legacy `TenantContract` rows with no `id`).

- **`PropertyForm.tsx`** — no functional change needed. Its already-present, currently-dead `location.coordinates` zod field (`:61-64`) and the payload wiring around it in `onSubmit` (`:286-293`) should be removed rather than left as unreachable dead weight, since the server now always derives coordinates itself and never trusts a client-supplied value (per the key decision above) — leaving it in would misleadingly suggest an owner can set their own pin.

- **Types**: `propertyService.ts`'s `PropertyLocation.coordinates?: {lat?, lng?}` (`:15-18`) already matches what's needed — no change. Note only, not in scope to fix here: a second, stale `Property`/`PropertyLocation` definition exists at `lynxbox-ph/src/features/properties/types.ts` with `coordinates` as *required* (not optional), consumed only by `features/platform-admin/types.ts` — worth reconciling only if platform-admin ever needs map data too.

## Verification

- `tsc --noEmit` in both `api/` and `lynxbox-ph/`.
- `next build` (static export) specifically — per this repo's own documented gotcha, `tsc`/`next lint` pass even when a client-only/dynamic-import requirement is violated; only a real static build catches it.
- Manual, in dev/sandbox:
  - Create a listing with a real, specific PH address → confirm `location.coordinates` gets populated in DynamoDB at the expected precision.
  - Create a listing with a garbage/unresolvable address → confirm the listing is still created successfully, `coordinates` stays absent, and it shows normally in list/search but is excluded once a bounds filter is applied.
  - Edit a listing without touching its address → confirm no redundant geocode call fires (re-geocode-on-change guard working).
  - Run `properties:backfill-coordinates` against a dev copy of the table → confirm it populates existing listings and that re-running it immediately after is a no-op (conditional expression skips already-geocoded rows).
- Load the public map view and pan/zoom across a few areas → confirm expired/suspended/non-`available` listings never appear on the map (visibility check unaffected by the new predicate), contact info never appears in marker popups (masking unaffected), and placement ordering (standard/priority/featured) still holds in whatever ranked list is shown alongside the map.
- Confirm no new entries were needed in `api/serverless.yml`, `infra/modules/api/routes.tf`, or `api/local-server.ts` — this feature should ship without touching any of the three route-config files, since it only extends an already-registered endpoint.
