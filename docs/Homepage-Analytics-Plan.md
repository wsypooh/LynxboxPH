# Homepage Analytics & A/B Testing Plan

Status as of 2026-10-16. Scope: measuring where signups come from on lynxbox.ph, and the groundwork for later homepage A/B tests. Nothing here is deployed until the next frontend deploy.

## Decisions

1. **No A/B test yet.** The site has just started being promoted on social media, so traffic is too low for a test to reach a trustworthy result. Headline/CTA changes are made directly, with the deploy date noted so before/after can be compared roughly. Revisit at a few hundred weekly visitors to the page being tested, and test big changes (headline, offer, CTA), not cosmetic ones.
2. **GA4 is the analytics tool** (already installed: `public/gtag-init.js`, loaded by `RootShell.tsx` on `lynxbox.ph` only). No new vendor or CSP change.
3. **First-touch UTM attribution is stored in localStorage, not just left to GA4.** GA4 attributes UTMs per session, but signup spans several page loads and the email-confirm step can happen hours later, after the session's campaign has expired. `lib/analytics.ts` stores the first visit's UTMs/referrer/landing path for 30 days and attaches them to every conversion event as `first_touch_*` params. First touch wins; a later UTM link doesn't overwrite it, and a visit without UTMs is stored too so it isn't overwritten either.

## Implemented (2026-10-16)

- `lynxbox-ph/src/lib/analytics.ts` — `captureAttribution()` (called once from `RootShell.tsx`'s mount effect, on every host) and `trackEvent(name, params)` (no-op when `window.gtag` is absent, i.e. everywhere except lynxbox.ph).
- Events:

| Event | Fires | Params |
| --- | --- | --- |
| `cta_click` | homepage hero CTA, bottom CTA, pricing-table "Get Started" | `location` (`hero`/`bottom`/`pricing`), `plan` (pricing only) |
| `sign_up` | `auth/signup/page.tsx`, after `signUp()` succeeds | `method`, `plan` |
| `signup_confirmed` | `auth/confirm-signup/page.tsx`, after `confirmSignUp()` succeeds | `plan` |

  Every event also carries `first_touch_utm_source/medium/campaign/content/term`, `first_touch_referrer`, `first_touch_landing_path` when known.
- Homepage hero copy updated (headline "Simplify Your Commercial Rental Management", new supporting paragraph, CTA "Sign Up Free"; the old tagline was removed).
- Site title: `Commercial Rental Management | Lynxbox PH` (default + Open Graph in `app/layout.tsx`). Description and OG description now follow the hero copy. Convention: every page title ends with ` | Lynxbox PH` (the root `title.template`); only pages with an explicit `title.absolute` differ.

## GA4 setup (manual, in the GA4 console — not in code)

- **Key events** (Admin → Data display → Events): mark `sign_up` and `signup_confirmed`. Use **Create with code** (name only; "Create without code" builds a duplicate `page_view` URL rule), **Don't set a default key event value** (a signup has no monetary value), counting **Once per event**. Do not mark `cta_click`: it's a funnel step and would inflate conversions.
- **Custom dimensions** (Admin → Data display → Custom definitions), scope **Event**, event parameter typed exactly (case-sensitive): `first_touch_utm_source`, `first_touch_utm_medium`, `first_touch_utm_campaign`, `first_touch_utm_content`, `first_touch_utm_term`, `first_touch_referrer`, `first_touch_landing_path`, `location`, `plan`. The parameter dropdown only lists parameters GA4 has already received, so before the first deploy the name has to be typed in by hand (or registered ~24h after a test event). A dimension only collects from the time it's created, so create them before promoting.
- Social links need UTMs, e.g. `https://lynxbox.ph/?utm_source=facebook&utm_medium=social&utm_campaign=launch`.

## Limits / known gaps

- First-touch data lives in the visitor's browser and goes only to GA4, not to the API. A signup on a different device/browser than the first visit loses it. Storing the source on the account record would need an API + signup-flow change (not done).
- Ad blockers drop GA4 events, so counts run low.
- Events fire only on `lynxbox.ph`; sandbox/localhost can't be used to see them (use DebugView on prod with a test UTM link).
- `trackEvent` doesn't attach an A/B variant yet.

## Future: when A/B testing becomes worthwhile

Options considered, in order of effort:
1. **Third-party tool** (GrowthBook, PostHog, VWO). Script/SDK, handles assignment and stats; client-side swaps can flash the original content, and the CSP (`infra/modules/frontend/main.tf`) would need the vendor's domain.
2. **CloudFront Function split** — assign a cookie at the edge and rewrite to `/` or a second static page, so there's no flicker. Extends the existing `url_rewrite` function; needs a variant-B page and the cache key to vary on the cookie.
3. **Client-side split** — pick A/B in localStorage on mount, render a neutral skeleton until chosen, send `variant` as a param through `trackEvent`.

Recommendation when the time comes: GrowthBook/PostHog or option 3 first; the CloudFront split only if flicker or volume demands it. Whichever is used, add `variant` to `trackEvent` payloads and register it as a custom dimension.
