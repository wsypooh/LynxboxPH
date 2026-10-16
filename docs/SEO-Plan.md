# SEO Plan

Status as of 2026-10-11. Scope: the public marketing/marketplace pages of `lynxbox-ph/` on **lynxbox.ph**. Sandbox (`sandbox.lynxbox.ph`) must never be indexed.

## Done (2026-10-11)

- **Root layout is now a server component** (`app/layout.tsx`) exporting real `metadata` (title template `%s | Lynxbox PH`, description, `metadataBase`, Open Graph, Twitter). The old client-only behavior (Amplify config, GA, landing-page nav hiding) moved to `components/RootShell.tsx`. The previous `app/metadata.ts` was never imported by anything, so Next ignored it; it was deleted.
- **Per-page metadata** via a sibling server `layout.tsx` (pages stay `'use client'`): `/pricing`, `/contact`, `/properties`, `/properties/detail` (the last is `noindex` — see below). `/` uses the root default.
- **`app/robots.ts`** (disallows `/dashboard/`, `/auth/`, points at the sitemap) and **`app/sitemap.ts`** (`/`, `/properties`, `/pricing`, `/contact`, `/help`, every help article). Both `force-static` for the static export.
- **`noindex`** on dashboard and auth layouts.
- **Sandbox excluded** with a CloudFront `X-Robots-Tag: noindex, nofollow` response header for every non-prod environment (`infra/modules/frontend/main.tf`). A header, not a robots.txt Disallow: the static export is the same build for every environment, and a Disallow would stop crawlers from ever reading a `noindex`. Needs `deploy-infra.ps1 -Environment dev` applied to take effect.
- **Share links**: `getPropertyDetailUrl()` (`utils/routing.ts`) now returns `/properties/detail?id=<id>`, the URL form that works for any property. The old `/properties/<id>` form only works for the 6 ids hardcoded in `generateStaticParams()`.

- **`/`, `/pricing`, `/contact` now have real content in the prerendered HTML** (home ~2,000 chars of body text, pricing ~1,200, contact ~200; was an empty `<body>`). Root cause was `AuthProvider` (`features/auth/AuthContext.tsx`) rendering `{!isLoading && children}`, which hid the entire site (including the nav) until the Cognito check finished, so the static export contained nothing. It now renders immediately for the paths in `RENDER_BEFORE_AUTH_PATHS` (`/`, `/pricing`, `/contact`); every other route keeps the old wait-for-auth behavior. No server/client page split was needed — with `output: 'export'`, `'use client'` pages are still prerendered. Side effect: a logged-in visitor briefly sees logged-out CTAs on these pages until auth resolves. To cover another public page, add its path to that list (only if the page tolerates `user === null` on first render).
- `/properties/detail` title now `Property Details | Lynxbox PH` (explicit `absolute` title).

- **Homepage title/description updated (2026-10-16)**: default and Open Graph title are `Commercial Rental Management | Lynxbox PH`; meta and OG description follow the new hero copy. Convention: every page title ends in ` | Lynxbox PH`. Analytics/UTM tracking for the same pages is in `docs/Homepage-Analytics-Plan.md`.

## Deliberately out of scope

- `/business-address`, `/landlord`, `/realtor`, `/properties/bacolod-condo-for-sale-...` are old pages. No metadata work, not in the sitemap.

## Future work

### 1. Real per-listing SEO for property detail pages (biggest gap)
Today every listing is served by the one client-rendered `/properties/detail?id=...` page, so a shared link has no per-listing title, image or price in its HTML, and the page is `noindex`. `generateStaticParams()` in `/properties/[id]/page.tsx` only pre-builds 6 hardcoded ids, so real listings fail on a direct `/properties/<id>` load. Options considered:

1. **Rebuild when listings change** — `generateStaticParams()` + `generateMetadata()` fetch published listings from the live API at `next build`; rebuild nightly and/or on publish/renew. Simplest. A brand-new listing's link is broken until the rebuild finishes; expired/unlisted listings linger until the next build.
2. **Pre-built pages + fallback for new ids (recommended)** — real static pages (with metadata) for existing listings, and a generic `_` placeholder page for ids with no file, served via a CloudFront origin-response rule (Lambda@Edge) instead of today's blanket `/realtor.html` custom error response. New listings work immediately; they gain SEO metadata at the next (nightly) rebuild. Reading the id client-side must use `window.location.pathname`, not `useParams()` (see CLAUDE.md "Fix 2 of 2").
3. **Keep `/properties/detail?id=`** (current) — works for any id, no per-listing metadata, can't be indexed individually.

When done: add `RealEstateListing`/`Offer` JSON-LD, Open Graph image/price per listing, add listing URLs to `sitemap.ts`, drop the `noindex` on the detail route, and only include `available`, non-expired listings.

### 2. Server-render or pre-render the main public pages
**Status: `/`, `/pricing`, `/contact` done (see above). Remaining: `/properties` (and `/properties/detail`) — body still empty.**

**Finding (checked 2026-10-11 against the built `out/` HTML):** `/`, `/pricing`, `/properties` and `/contact` ship with an **empty `<body>`** — only `<span></span><span id="__chakra_env">` — identical on every page. Only the `<title>`/meta (added above) is in the HTML. All real content (headings, copy, plan table, listings, form) exists only after JavaScript runs. (`/help` is unaffected: it's a server component.)

**Does Google still see it?** Mostly yes, but not reliably. Googlebot indexes in two waves: it reads the raw HTML first, then queues the page for a JS-rendering pass that can lag hours to days or occasionally fail on slow/erroring scripts. Content only found after JS is indexed late and less dependably. Many other consumers **never** run JS: Facebook/Messenger/Slack/WhatsApp link previews, most AI/LLM crawlers, and some smaller search engines. Titles and descriptions work today; the body text doesn't.

**Effort: moderate, mostly mechanical.** The pattern already exists in the repo (thin server `page.tsx` + client component).
- `/contact`, `/pricing`: easy (~1h each). Contact is a form, so server page + client form component. Pricing fetches plans in the browser: server-render the static copy, leave the plan table client-side (or fetch at build time).
- `/` (home): moderate. It's `'use client'` for auth/account-aware buttons. Keep hero/copy on the server; move only the auth-aware CTAs into small client components.
- `/properties` (browse): the hard one. Listings come from the live API after load; to appear in the HTML they need build-time data (same rebuild trade-off as item 1, options 1/2). Individual listing pages matter more for search than this index page, so do this last.
- Also find out why the root `Providers`/layout renders nothing at build time (body is empty even for pages whose own JSX is static) — fixing this may make some pages' static content appear in the HTML for free.

Order: `/contact` and `/pricing`, then `/`, then `/properties` after the listing-page decision.

### 3. Structured data
**Effort: easy (hours).** A `<script type="application/ld+json">` in a server component; no CSP change needed (JSON, not executable). Must be in server-rendered HTML to count, so pages in item 2 should be server components first (or put it in the root layout for site-wide `Organization`/`WebSite`).
- `Organization` + `WebSite` JSON-LD on `/` (one file).
- `FAQPage` on `/pricing` only if a real FAQ section is added.
- `BreadcrumbList` on help articles.
- Per-listing `RealEstateListing`/`Offer`: depends on item 1 (needs real per-listing pages); the only non-trivial one.

### 4. Open Graph image
A real 1200x630 share image (currently the logo PNG), plus `canonical` URLs per page via `alternates.canonical`.

### 5. Verify after deploy
Google Search Console + Bing Webmaster for lynxbox.ph only; submit `sitemap.xml`; confirm `curl -I https://sandbox.lynxbox.ph` shows `x-robots-tag` and `lynxbox.ph` doesn't. If sandbox was already indexed, use Search Console's removals tool to speed up de-indexing.
