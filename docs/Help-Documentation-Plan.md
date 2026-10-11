# Help / Documentation Plan

## Context
User-facing help docs (with screenshots) built from CLAUDE.md and the `docs/*-Plan.md` files, with a way to keep them updated as features change.

## Decisions

1. **No separate website (no help.lynxbox.ph).** Add a `/help` section inside the existing Next.js app (`lynxbox-ph/`). Same CloudFront/S3 deploy (`deploy-frontend.ps1`), same domain, no new Terraform or CI. A subdomain only makes sense later if a different team/release cadence or tool (Docusaurus/Mintlify) is wanted; Markdown content moves over unchanged.
2. **Static, content-as-Markdown in git, not DynamoDB/platform-admin editing.** The app is a static export with no server; a DB-backed CMS would need new endpoints (routes.tf + serverless.yml + local-server.ts), an editor UI, HTML sanitization, and client-side fetching (hurts SEO/load speed). Help content changes when features change, so keeping it in the same PR is the main benefit. Revisit only if non-developers need to edit copy frequently.
3. **No separate sandbox for help.** Sandbox already receives the frontend build, so `/help` ships there on every sandbox deploy and is previewed before prod.

## Implementation steps

1. **Content** — `lynxbox-ph/content/help/*.md` (frontmatter: title, order, audience). Articles written in user language, sourced from plan docs:
   - Getting started (signup, plans, trial) — Pricing-Strategy, Payments-and-Subscription
   - Buildings & Tenants; Documents — Documents-Feature-Plan
   - Invoicing: create, rollover, meter readings, void, CSV import/export — Rental-Invoicing, Ledger-Plan
   - Recording payments, ledger, penalties, waived tenants — Ledger-Plan
   - Property listings (photos, CSV+ZIP import, renew, drafts) — Property-Listing-Plan
   - Team & roles (owner/manager/staff/viewer) — RBAC-Admin-Plan
   - Billing & subscription (GCash/bank proof, promo codes, past_due) — Payments-and-Subscription
   - Platform-admin guide kept separate/internal (not linked publicly).
2. **Rendering** — `app/help/page.tsx` (index) and `app/help/[slug]/page.tsx` with `generateStaticParams()` from the content folder (all slugs known at build time, so none of the `_` placeholder / CloudFront rewrite problems apply). `react-markdown` + `remark-gfm` + `gray-matter`, Chakra styling, sidebar nav, simple client-side search over a build-time JSON index. Link "Help" from the dashboard header and landing page.
3. **Screenshots** — `lynxbox-ph/content/help/images/`, produced by a repeatable Playwright script (`scripts/help-screenshots.ts`) that logs into **sandbox** with a demo account seeded with fake data (no real tenant PII). Re-run after UI changes. Commit optimized PNG/webp.
4. **Keeping it current** — add a "Help docs" rule to CLAUDE.md: any user-visible feature change updates the matching `content/help/*.md`; a prompt/skill can diff plan docs and commits against articles.
5. **Deploy** — normal `deploy-frontend.ps1`, verify on sandbox first; confirm CSP in `infra/modules/frontend/main.tf` doesn't block same-origin image/search assets.

## Verification
- `npm run build` in `lynxbox-ph/`; confirm `out/help/<slug>.html` exists per article.
- Hard-refresh a `/help/<slug>` URL on sandbox renders the right article.
- Screenshot script runs end-to-end against the sandbox demo account; no real customer data in images.
- Search returns expected results.

## Open items
- Audience: landlord users only, or also a platform-admin section?
- Public (no login) vs login-only help. Recommended: public (SEO, signup questions).

## Status
- 2026-10-10: Plan approved. Decided: public help, landlord audience only, no platform-admin section.
- 2026-10-10: Built `/help` (index + `[slug]`, `src/lib/help.ts`, `src/components/help/HelpLayout.tsx`, "Help" link in `Navigation.tsx`) and 7 initial articles in `lynxbox-ph/content/help/`. `next build` passes and exports `out/help/<slug>.html`. Search is a simple client-side title/summary filter.
- 2026-10-11: Screenshot/video tooling built in `lynxbox-ph/scripts/help-media/` (Playwright, run with Node): `frame.mjs` (fake browser frame showing `lynxbox.ph`, visible cursor, login helper), `seed-demo-data.mjs` (fake building/tenants/charge in the sandbox demo account, idempotent), `topics/record-payment.mjs` (first topic, since folded into the shared `run.mjs` runner), and `narration/record-payment.md`. Credentials come from `HELP_DEMO_EMAIL`/`HELP_DEMO_PASSWORD` env vars, base URL from `HELP_BASE_URL` (default `https://sandbox.lynxbox.ph`). Screenshots live in `public/help-images/` (not `content/`), since only `public/` is exported.
- Gotchas found: top-nav and form both have a "Sign In" button (use `form button[type="submit"]`); Playwright runs the newest route handler first, so a catch-all must call `route.fallback()`, not `continue()`.
- 2026-10-11: Video hosting decided: finished videos live in `lynxbox-ph/public/help-videos/<topic>.mp4` (committed, ships with the normal `deploy-frontend.ps1` S3 sync; CSP `default-src 'self'` already allows it). Keep each under ~2-3 MB; move to a separate bucket/CDN path if there are ~10+ or they get long. Help articles embed one with image syntax pointing at an .mp4: `![Video: ...](/help-videos/<topic>.mp4)` (`HelpLayout.tsx` renders it as a `<video controls>`). Workflow: run the topic script -> record voice-over using `scripts/help-media/narration/<topic>.md` -> `node scripts/help-media/finalize-video.mjs <topic> <voiceover-file>` (720p, H.264+AAC; holds the last frame if narration runs longer; omit the file for a silent version).
- 2026-10-11: Draft synthetic voice-over: `pwsh scripts/help-media/make-voiceover.ps1 -Topic <topic> [-Voice "Microsoft Zira Desktop"] [-Rate 1]` speaks each row of `narration/<topic>.md` with the offline Windows voices and mixes it in via `finalize-video.mjs`. The recorder writes `out/<topic>.json` (`trimStart` = loading time cut from the video, `marks` = when each step happens); narration rows are keyed by step name so lines stay in sync after a re-recording. Replace with a human voice-over later by passing an audio file to `finalize-video.mjs`.
- 2026-10-11: All 14 topics recorded (screenshots + silent videos) and embedded in the 7 articles: signup, dashboard-tour, add-building, add-tenant, tenant-documents, create-invoice, meter-readings, invoice-statement, record-payment, tenant-ledger, add-property-listing, property-import, invite-team-member, billing-overview. Each is a short file in `lynxbox-ph/scripts/help-media/topics/<topic>.mjs`; `node scripts/help-media/run.mjs [topic ...]` regenerates them (`node scripts/help-media/seed-demo-data.mjs` first if the demo data is gone). Screenshots are named `<topic>-<label>.png` (label only, no numbers, so adding/removing a shot never renames the others); unused shots are deleted rather than kept. Verified in Edge: every article loads all images and plays all videos (Playwright's bundled Chromium cannot decode H.264, so use `channel: 'msedge'` to check playback).
- Voice-over kit: `node scripts/help-media/voiceover-kit.mjs build` collects each silent video plus a timed script into `scripts/help-media/out/voiceover-kit/` (gitignored); drop finished audio into its `audio/` folder named `<topic>.m4a|mp3|wav` and run `... apply` to mix it into `public/help-videos/`.
- Things deliberately kept out of public media: the platform's real receiving bank account number and QR code on the Billing page (the billing topic never scrolls to or captures it), and the Business-plan usage cards' "of null allowed" text (hidden in the dashboard recording). The Team topic blurs the member emails (the demo account's own address) in both screenshot and video.
- Found while capturing, and fixed (2026-10-11): the Dashboard's usage cards showed "of null allowed" / "of NaN undefined allowed" on the Business plan, and the Property CSV import would have flagged every row as over the listing limit. Cause: unlimited caps are `Infinity` server-side, which JSON turns into `null`, so the frontend's `=== Infinity` checks never matched. Fixed once in `billingService.getUsage()` (restores `Infinity` for `maxProperties`/`maxInvoicesPerMonth`/`maxSeats`/`maxDocumentBytes`). Needs a frontend deploy to take effect; `topics/dashboard-tour.mjs` still hides those lines in the recording until sandbox runs the fixed build (then remove that workaround and re-record).
- Not yet done: human voice-overs (a synthetic draft exists only for record-payment), sandbox hard-refresh verification of `/help/<slug>`, deploy.
