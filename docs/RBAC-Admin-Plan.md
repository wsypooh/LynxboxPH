# RBAC + Platform-Admin Dashboard — Plan

## Context

Two things came up together: (1) a long-planned RBAC feature (per-account roles so an owner can bring on manager/staff/viewer users — this was already flagged as a "someday" feature, motivated by wanting to support a property manager working alongside an owner), and (2) a new idea — a platform-admin role for the operator (you) to see aggregate stats across every customer account and drill into any one of them, read-only.

While investigating, we found `api/src/handlers/admin/propertyHandler.ts` — an unfinished, **unwired** prototype of exactly this admin idea (cross-account scan, per-user drill-in, a "safe impersonation - read-only view"). It's dead code (no route in `serverless.yml`/`routes.tf`/`local-server.ts`/`index.ts`), and its admin check is spoofable (`claims.sub?.startsWith('admin-')` is one of its three OR conditions). **To be clear on what this file is** (a fair question, since "admin" is overloaded here): it is neither the normal property-management API your own dashboard uses (that's `api/src/handlers/properties/handler.ts`, authenticated, scoped to `ownerId`) nor the public listing API (the public, unauthenticated property-viewing endpoints — `/api/public/*` — also live inside `properties/handler.ts`). It's a third, distinct, never-finished concept: a platform-operator view across *every* customer's data. Because that naming already caused confusion once, this plan renames the new version to **`platformAdmin`** (folder, routes, service) rather than reusing the ambiguous `admin` name, so it's never mistaken for "an owner's own admin/management view of their account."

We also found, independently, that `properties/handler.ts` has its ownership check **commented out** on both `updateProperty` (line 314-317) and `deleteProperty` (line 362-366) — today, any authenticated user can edit or delete any property regardless of who owns it. This is a real pre-existing vulnerability, unrelated to RBAC, and should be fixed as part of this work since we're touching this exact authorization logic anyway. This is purely a backend-enforcement bug — there's no known UI path today that would show you an edit/delete button on a property you don't own (dashboard lists are already scoped to your own properties), so the fix is a server-side regression test via direct API call, not a button-hiding change.

Decisions made (do not re-litigate without updating this doc):
1. Platform admin is **read-only for account/tenant/property/invoice data** — dashboard stats + drill into any account, no support-action allow-list, no "log in as this account" impersonation. This is confirmed sufficient for now ("as long as I could go to the account to see, that would be good enough"). **True impersonation is an explicit future enhancement, not part of this plan**: it would mean issuing the admin a session/token scoped to another user's identity, full audit logging of every action taken while impersonating, and probably a break-glass confirmation step before entering that mode — a meaningfully bigger and higher-risk feature than read-only drill-in, worth its own design pass when actually needed.

   **One narrow, implemented exception, added by `docs/Pricing-Strategy-Plan.md`**: platform-admin can set an account's subscription `plan` (free/starter/growth/business) via `PUT /api/platform-admin/accounts/{accountId}/plan` — this is actually platform-admin's *first* write action (not the Payments plan below, despite the "Planned deviation" section title further down, written before this endpoint was implemented). It exists only because there's no payment gate yet: someone has to be able to activate a paid plan by hand once payment is manually collected. It edits a billing-adjacent field on the account record only — never a customer's property/tenant/invoice/document data — and doesn't reopen impersonation or a general support-action allow-list.

   **Planned, scoped deviation (not yet implemented) — see "Planned deviation" section near the end of this doc**: the follow-up Payments and Subscription plan gives platform-admin three *more* write actions on top of the plan-toggle above (approving/rejecting a customer's payment submission, extending a trial, managing promo codes). This does not reopen impersonation or a general support-action allow-list, both of which remain out of scope as stated above — it's a narrow, specific exception for billing verification only. Update this decision to reflect the new reality once that plan is actually implemented, rather than leaving it stated as an absolute.
2. Platform admin membership is a **Cognito Group** (`platform-admin`), checked from JWT claims — not a hardcoded user ID, not a DynamoDB flag. Starting with one member costs nothing extra later: adding a second admin is just adding them to the group via CLI, zero code changes.
3. Per-account roles: **owner / manager / staff / viewer**. Owner = today's implicit behavior (the Cognito user whose sub the account's data is keyed to), unrestricted, plus the only one who can manage other members. Manager and staff are **functionally identical in v1** — full create/edit access to properties/tenants/invoices/payments, blocked from voiding invoices, deleting anything, or managing members. Viewer is fully read-only. Non-owner roles should have their disallowed actions **hidden from the UI entirely, not just disabled** — same principle already used for the read-only admin drill-in view, so a manager/staff/viewer user never sees a button that would just 403. (No invoice-approval workflow — that idea is explicitly deferred, not part of this plan.)

   **These two role mechanisms are deliberately different, and it matters**: platform-admin lives in a **Cognito Group** (baked into the JWT, so a role change only takes effect after the user logs out/in or their token refreshes — acceptable for a rare, coarse, high-privilege flag). Owner/manager/staff/viewer live in the **`MEMBER#` DynamoDB record** (Phase 2), read fresh by `resolveActor()` on every request — a role change here takes effect on the very next API call, no logout needed. Don't conflate the two or put per-account roles in Cognito Groups: Groups are global per Cognito user, not scoped per account, so they can't represent "manager on account A, viewer on account B" the way a `MEMBER#<accountId>#<sub>` row naturally does.

   **Confirmed choice: a DynamoDB `GetItem` per request, not a JWT-embedded claim.** Considered baking the role into the token via a Cognito Pre-Token Generation trigger (same mechanism as platform-admin) to avoid the per-request read entirely, but decided against it: at this app's scale a per-request `GetItem` costs on the order of $0.25 per million reads (well under $1/month even at 10-100x current traffic) and adds low-single-digit-millisecond latency — negligible either way. Since role changes should apply immediately rather than waiting for a token refresh, and the JWT-trigger approach would mean building and maintaining a new Lambda trigger for a cost problem that doesn't actually exist, the plain DB read wins on simplicity. Revisit only if request volume grows enough that this specific read shows up as a real line item — unlikely for this app's usage pattern.
4. Admin dashboard aggregation is **computed on-demand** at request time in Phase 1 (see "Why not DynamoDB Streams" below for the reasoning, with real numbers).
5. **Phase 2 open questions, resolved:**
   - Inviting someone **should** be able to create a brand-new Cognito user for them (not just invite people who already have a login) — see IAM/Cognito impact below.
   - A Cognito user **should** be able to belong to more than one account (e.g. someone doing books for several owners) — see "Account switching" below for what that actually requires.

## Scope: both phases implemented

**Status: Phase 1 and Phase 2 are both implemented** (2026-09-23) — see below for what shipped and where each deviated from the original sketch.

Phase 1 covers the auth refactor, the property security fix, and the platform-admin dashboard. Phase 2 covers real multi-user accounts, the invite flow, account switching, and role enforcement across every handler and dashboard page. Neither has been deployed to any real environment yet (Terraform validated only, not applied) or tested end-to-end against live AWS — see each phase's Verification section for exactly what was and wasn't checked.

---

## Phase 1 implementation

### 1. Fix the property ownership bug

In `api/src/handlers/properties/handler.ts`:
- `updateProperty` (~line 311-317): uncomment/implement the ownership check using the resolved actor's id, returning `ApiResponse.forbidden(...)` on mismatch — same pattern as every other handler's `x.ownerId !== userId` check.
- `deleteProperty` (~line 359-367): same fix.

Flag this explicitly in the PR description as a security fix, not a refactor.

### 2. Fix broken profile email-change flow

`lynxbox-ph/src/app/dashboard/profile/page.tsx` (~line 204-220) lets a user edit their email and calls Amplify's `updateUserAttributes` (via `AuthContext.tsx:151-183`). The Cognito User Pool has `attributes_require_verification_before_update = ["email"]` (`infra/modules/auth/main.tf:68-70`), so an email change **doesn't take effect** until the new address is verified — but the UI never sends or asks for that verification code. Today it shows a success toast and silently does nothing; the email never actually changes in Cognito. Fix: after `updateUserAttributes` returns a `nextStep` of `CONFIRM_ATTRIBUTE_WITH_CODE` for the email attribute, call Amplify's `sendUserAttributeVerificationCode('email')` / prompt for the code and call `confirmUserAttribute({ userAttributeKey: 'email', confirmationCode })`, mirroring the same code-entry pattern already used on `auth/confirm-signup/page.tsx`. Unrelated to RBAC, but a real pre-existing bug worth fixing alongside the other two.

### 3. Central auth helper — `api/src/lib/auth.ts` (new)

Replaces the six copy-pasted `getUserId(event)` implementations (`buildings`, `tenants`, `invoices`, `ledger`, `documents` handlers each have one; `properties/handler.ts` inlines the same logic three separate times instead of a shared function).

```ts
export type Role = 'owner' | 'manager' | 'staff' | 'viewer';

export interface Actor {
  sub: string;
  accountId: string;      // Phase 1: always === sub (no memberships exist yet)
  role: Role;              // Phase 1: always 'owner'
  isPlatformAdmin: boolean;
  displayName: string;
}

export function resolveActor(event: APIGatewayProxyEvent): Actor | null;
export function isPlatformAdmin(event: APIGatewayProxyEvent): boolean;
```

`resolveActor` keeps the exact same sub-resolution fallback chain every handler uses today (`claims.sub || claims['cognito:username'] || (IS_OFFLINE ? 'local-test-user-123' : null)`), so local dev and serverless-offline keep working unmodified. In Phase 1, `accountId` is always the sub and `role` is always `'owner'` — this is byte-for-byte today's behavior, just centralized. `isPlatformAdmin` reads `claims['cognito:groups']`.

**Important parsing detail (corrected after real sandbox testing — see below)**: API Gateway's JWT authorizer exposes multi-valued claims like `cognito:groups` in `event.requestContext.authorizer.claims` as something other than a plain JS array (no `payload_format_version` is set anywhere in `infra/modules/api/`, and every existing handler already reads `claims.sub` directly rather than the v2.0-format `authorizer.jwt.claims.sub` shape — consistent with the v1.0 default). The *initial* implementation assumed a comma-joined string (e.g. `'platform-admin,other-group'`) — **this was wrong**. Confirmed via CloudWatch on the real deployed API: it's actually a bracket-wrapped, comma-separated, **unquoted** string — e.g. `"[platform-admin]"` or `"[group-a, group-b]"` — neither valid JSON (missing quotes) nor a plain comma-joined string. Parse defensively for the confirmed real shape, with JSON and plain-comma as fallbacks in case another surface ever sends those instead:

```ts
function parseGroups(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  const bracketMatch = trimmed.match(/^\[(.*)\]$/);
  if (bracketMatch) return bracketMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch { /* fall through */ }
  return trimmed.split(',').map(s => s.trim()).filter(Boolean);
}
```

Then do an exact-match `.includes('platform-admin')` on the parsed array — **not** the dead prototype's substring `.includes()` on the raw claim, which would false-positive on a future group name like `platform-admin-readonly`.

Refactor all six handlers to call `resolveActor()` at the top of `handle()` instead of their local `getUserId()`/inline claim reads, and use `actor.accountId` wherever `userId` is currently used in ownership checks. No behavioral change in Phase 1 since `accountId === sub` always.

### 3. Platform-admin dashboard

**Delete** `api/src/handlers/admin/propertyHandler.ts` — it's unimported dead code with a spoofable admin check and stubbed write actions that contradict the read-only decision. Its shape (list-all, per-account drill-in) is worth keeping conceptually, reimplemented cleanly under the `platformAdmin` name.

**New: `api/src/repositories/platformAdminRepository.ts`** — `getPlatformSummary()`. Does **one** unfiltered `ScanCommand`, paginated to exhaustion via `LastEvaluatedKey` (loop until undefined — the dead prototype only fetched one page, which is wrong for a total/count endpoint), then buckets every item in memory by its existing `entityType` and `ownerId` fields:

```ts
async function scanEntireTable(): Promise<BaseEntity[]> { /* loop ExclusiveStartKey until done */ }

export async function getPlatformSummary() {
  const items = await scanEntireTable();
  // bucket by ownerId -> { propertyCount, tenantCount, buildingCount, documentCount, invoicesByMonth }
  // skip items with no ownerId (future MEMBER/USER records) and soft-deleted items
}
```

One unfiltered Scan is deliberately preferred over four separate `FilterExpression`-based Scans (one per entity type) — DynamoDB bills a filtered Scan for the *entire* table read regardless of how much the filter discards, so four filtered Scans would read the whole table four times over for no benefit. No new IAM permission is needed — `dynamodb:Scan` on the table is already granted (used by the dead prototype and by `InvoiceRepository.listByOwnerMonth`'s existing Scan).

The account drill-in (`GET /api/platform-admin/accounts/{accountId}`) reuses the existing per-owner repository methods directly (`PropertyRepository.listByOwner`, `BuildingRepository.listByOwner`, `TenantRepository.listByOwner`, `InvoiceRepository.listByOwner`) — no new query logic needed for a single account.

**One small gap to fill**: `DocumentRepository` currently only exposes `listByParent(ownerId, parentType, parentId)` (documents are always fetched per-building/per-tenant), not a `listByOwner(ownerId)` across all of an account's documents. Since `Document.GSI1PK` is already `USER#<ownerId>` and `GSI1SK` is `DOCUMENT#<parentType>#<parentId>#<id>` (same shape as Property/Tenant/Building), a `listByOwner` is a one-line addition — `Query GSI1PK = USER#<ownerId>, begins_with(GSI1SK, 'DOCUMENT#')` — following the exact pattern the other repositories already use. Add this method and use it for the drill-in's document count/list; the dashboard *summary* endpoint doesn't need it since its document count comes from the same full-table Scan as everything else.

**New: `api/src/handlers/platformAdmin/dashboardHandler.ts`** — `PlatformAdminDashboardHandler.handle(event)`, gated by `isPlatformAdmin(event)` returning `ApiResponse.unauthorized(...)` otherwise:
- `GET /api/platform-admin/dashboard/summary`
- `GET /api/platform-admin/accounts/{accountId}`

**Routes — all three places, plus `index.ts`:**
1. `api/serverless.yml` — two new `- http:` blocks, `cors: true` + the existing `ApiGatewayAuthorizer` request authorizer, same pattern as every other protected route.
2. `infra/modules/api/routes.tf` — two new `aws_apigatewayv2_route` resources, `authorization_type = "JWT"` + `authorizer_id = aws_apigatewayv2_authorizer.cognito.id`. **This is the file that actually matters for sandbox/prod.**
3. `api/local-server.ts` — explicit `app.all('/api/platform-admin/dashboard/summary', ...)` and `app.all('/api/platform-admin/accounts/:accountId', ...)` lines.
4. `api/src/index.ts` — new `if (event.path?.includes('/api/platform-admin')) { return await PlatformAdminDashboardHandler.handle(event); }` branch.

### 5. Why not DynamoDB Streams for the counts (with real numbers)

Streams themselves are free to enable, and the actual AWS bill for a Streams-backed counter at this app's scale would be trivial — stream reads are billed at roughly $0.02 per 100,000 read-request-units, and the attached Lambda would run well within the always-free tier (1M requests/month) given how few writes this app does. So the deferral isn't really about dollars — realistically it'd cost cents a month, if that.

The actual cost is engineering complexity you don't need yet: Streams deliver events **at-least-once**, so a naive "increment on every event" counter can double-count on a retried delivery — you'd need idempotent counter updates (e.g. conditional writes keyed by stream sequence number). You'd also need a one-time backfill script to seed the initial counts, a new Lambda + IAM permissions + monitoring for consumer errors/lag, and a way to reconcile if the counter ever drifts from reality. On-demand Scan, by contrast, is always exactly correct (it reads live data), costs a fraction of a second at ~100 properties, and has zero moving parts to maintain. **Recommendation stands: on-demand for now** — revisit only if the table grows enough (thousands+ of items) that Scan latency becomes user-visible, at which point the Streams investment pays for itself.

### 6. Frontend (`lynxbox-ph/src`)

- `src/services/platformAdminService.ts` (new) — same singleton/`request<T>()` pattern as `src/services/invoiceService.ts`. `getDashboardSummary()`, `getAccountDetail(accountId)`.
- `src/features/platform-admin/types.ts` (new, mirroring the `features/documents/types.ts` split) — reuses the existing `Property`/`Building`/`Tenant`/`Invoice`/`Document` types rather than redefining them.
- `src/app/dashboard/platform-admin/page.tsx` (new) — summary table: total accounts, and per-account property/tenant/building/document counts + invoices-by-month. **Deviation from the original sketch**: nested under `/dashboard/platform-admin` rather than a standalone `/platform-admin/dashboard` route, because `DashboardSidebar` (and its nav link) only renders inside `app/dashboard/layout.tsx` — a standalone route would have had no navigation chrome at all.
- `src/app/dashboard/platform-admin/accounts/[accountId]/page.tsx` (new) — read-only drill-in. Deliberately renders **no** edit/delete affordances at all (not just disabled buttons).
- Nav gating in `src/app/dashboard/DashboardSidebar.tsx`: show a "Platform Admin" link only when the decoded ID token contains `platform-admin` in `cognito:groups` (via a new `getIsPlatformAdmin()` helper in `src/lib/auth.ts`). Client-side check is defense-in-depth only — real enforcement is the server-side `isPlatformAdmin` gate.

---

## Phase 2 — implemented (2026-09-23)

Two implementation choices were made explicitly at build time (both previously flagged as open in this doc):
1. **Invite UX: temporary password**, not a magic link. Cognito `AdminCreateUser` generates the account with a temp password we control, `MessageAction: 'SUPPRESS'` suppresses Cognito's own email, and `ZeptoMailService.sendAccountInviteEmail` sends ours instead. The invitee signs in with the temp password and Cognito forces a password change via the native `CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED` challenge — no custom token/magic-link infrastructure needed.
2. **Full account switching was built now**, not deferred — a single Cognito user can belong to and switch between multiple separate accounts (e.g. someone who is `owner` of their own account and `manager` on someone else's).

### Data model

**One deviation from the original sketch**: only `EntityType.MEMBER` was added — the separate `USER#<sub>`/`SK: PROFILE` entity was *not* built. Email and display info are denormalized directly onto each `MEMBER#` row instead (`email`, `invitedByEmail` fields on `api/src/models/member.ts`), which is simpler and sufficient for the "manage members" list; a standalone profile entity can be added later if a real need for account-independent profile data shows up.

`EntityType.MEMBER`, `PK: ACCOUNT#<accountId>`, `SK: MEMBER#<sub>`, `GSI1PK: USER#<sub>`, `GSI1SK: MEMBER#<accountId>` (`api/src/models/member.ts`, `api/src/repositories/membershipRepository.ts`). Listing members of an account is a plain base-table Query (`PK = ACCOUNT#<accountId>, SK begins_with MEMBER#`); listing a user's account(s) is the GSI1 Query, always filtered to `begins_with(GSI1SK, 'MEMBER#')` to avoid colliding with the same `GSI1PK: USER#<sub>` used by Property/Tenant/Building/Document.

**Zero-migration path confirmed working as designed**: solo accounts that have never invited anyone have zero `MEMBER#` rows; `resolveActor` (now `async`, in `api/src/lib/auth.ts`) queries `MembershipRepository.listByUser(sub)` and falls back to `{ accountId: sub, role: 'owner' }` when empty — byte-for-byte today's old behavior. The first invite on a solo account lazily creates the owner's own `MEMBER#` row too (`AccountHandler.inviteMember`), so from then on `listByAccount` always includes the owner explicitly.

### Invite flow (`api/src/handlers/account/handler.ts`, `api/src/lib/cognitoAdmin.ts`)

`POST /api/account/members` (owner-only, gated by `canManageMembers`): looks up the invitee's email via `AdminGetUserCommand` first — if they already have a Cognito login elsewhere (e.g. they own their own separate Lynxbox account), they're just granted a new `MEMBER#` row on this account with `status: 'active'`, no new Cognito user created. Otherwise, `createCognitoUser` generates a random policy-compliant temporary password, calls `AdminCreateUserCommand` with `MessageAction: 'SUPPRESS'`, and `status: 'invited'` is recorded (this status is purely informational — it never flips to `'active'` automatically; there's no post-confirmation Cognito trigger watching for first login, since access is already fully granted via the `MEMBER#` row regardless of status. A future enhancement could add that trigger if the distinction ever needs to be functional, not just cosmetic).

New infra to support this:
- `api/src/lib/cognitoAdmin.ts` — `findCognitoUserByEmail`, `createCognitoUser`, `generateTemporaryPassword` (satisfies the User Pool's password policy).
- IAM: `cognito-idp:AdminCreateUser`/`AdminGetUser` scoped to the actual User Pool ARN, added to both `api/serverless.yml` (local) and a new `aws_iam_role_policy.lambda_cognito_admin` in `infra/modules/api/main.tf` (uses a new `data.aws_caller_identity.current` to build the ARN).
- `USER_POOL_ID` added to `serverless.yml`'s environment block (was already present in the Terraform Lambda env, per the original gap noted here — now closed for local-dev parity).
- **New, not originally anticipated**: `FRONTEND_URL` env var, needed to build the sign-in link inside the invite email. Wired through `infra/modules/api/main.tf` (`https://${var.domain_name}` in real environments, `http://localhost:3001` fallback) and `serverless.yml` (`${env:FRONTEND_URL, 'http://localhost:3001'}` for local dev) — reuses the `domain_name` variable that already existed for Cognito's own redirect URLs, rather than inventing a new domain.
- `@aws-sdk/client-cognito-identity-provider` added as a new dependency in `api/package.json`.

### Account switching — implemented in full

- **Backend**: `resolveActor(event)` reads an `X-Account-Id` header via a case-insensitive lookup (`getHeader()` in `api/src/lib/auth.ts` — API Gateway/Express header casing isn't guaranteed), and looks for a matching entry in the user's own memberships. If absent or invalid, it silently falls back to the membership where `role === 'owner'` (the user's own account), then to the first membership found — never grants an account that isn't a real membership.
- `GET /api/account/memberships`, `GET /api/account/me`, `GET /api/account/members`, `PUT`/`DELETE /api/account/members/{sub}` all live in the new `AccountHandler`.
- **Frontend**: `lynxbox-ph/src/features/account/AccountContext.tsx` (new `AccountProvider`/`useAccount()`, wraps the app inside `AuthProvider` in `components/providers.tsx`) fetches `/api/account/me` + `/api/account/memberships` whenever the authenticated user changes, and exposes `canWrite`/`canDestroy`/`canManageMembers`/`switchAccount`. `lib/auth.ts` gained `getActiveAccountId`/`setActiveAccountId` (backed by `localStorage`, a viewer-side convenience only) and `getAuthHeaders()` now attaches `X-Account-Id` automatically on every request. A small `<Select>` switcher appears at the top of `DashboardSidebar` only when `memberships.length > 1`.

### Role enforcement — implemented across all six handlers plus the frontend

`canWrite`/`canDestroy`/`canManageMembers` added to `api/src/lib/auth.ts` exactly as designed. Every handler (`buildings`, `tenants`, `invoices`, `ledger`, `documents`, `properties`) now gates its write endpoints with `canWrite` and its destructive endpoints (`delete*`, `voidInvoice`, `resetLedger`) with `canDestroy`; every `create` already set `ownerId: actor.accountId` since Phase 1, so no change was needed there.

Frontend gating was done as a dedicated pass across 8 files (`dashboard/buildings/page.tsx`, `dashboard/tenants/page.tsx`, `dashboard/tenants/[id]/TenantDetailClient.tsx`, `dashboard/invoices/[id]/InvoiceDetailClient.tsx`, `features/invoicing/components/{TenantList,InvoiceList}.tsx`, `features/documents/components/DocumentList.tsx`, `components/DashboardPropertyList.tsx`) — every write/destroy control is conditionally rendered (not just disabled) based on `useAccount()`, mirroring the read-only platform-admin view's "no affordance at all" approach. Public-facing pages (`Navigation.tsx`, `app/properties/page.tsx`, `PropertyList.tsx`, `PropertyDetail.tsx`) were deliberately left untouched — no role applies to an anonymous visitor.

**New: `lynxbox-ph/src/app/dashboard/team/page.tsx`** — owner-only (`canManageMembers`) page to invite members, change roles, and remove members, using `accountService.ts`.

**New: `lynxbox-ph/src/components/auth/NewPasswordChallenge.tsx`** — handles the `CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED` Amplify sign-in step (mirrors the existing `MFAVerification.tsx` pattern), wired into `auth/signin/page.tsx` alongside the existing MFA challenge handling.

### Verification (2026-09-23)

- `api/` (`npx tsc --noEmit`) and `lynxbox-ph/` (`npx tsc --noEmit`, `npx next lint`) both clean — no new errors or warnings beyond pre-existing `react-hooks/exhaustive-deps`/`no-img-element` warnings already present elsewhere in the codebase.
- `terraform validate` passes. **Not applied** — no `terraform plan`/`apply` run against any real environment.
- **Not tested end-to-end against live AWS** — the invite flow's `AdminCreateUser`/`AdminGetUser` calls need `USER_POOL_ID` set and Cognito admin IAM permission on whatever AWS credentials are used, whether that's the deployed Lambda's role (now granted via Terraform) or local dev's `.env` credentials (not currently granted — local `.env` today only has DynamoDB/S3-scoped access via whatever IAM user it uses, so testing the invite flow locally needs that IAM user's permissions extended, or testing against a deployed sandbox instead).

### Fixes found during the first real test pass

Everything below was found and fixed while actually running the invite flow and platform-admin dashboard locally for the first time — real bugs the earlier "clean tsc/lint" verification couldn't have caught, since they're runtime/config gaps, not type errors.

- **`USER_POOL_ID` was genuinely missing from local `api/.env`** (not just undocumented — actually absent), so every `AdminGetUser`/`AdminCreateUser` call failed with `InvalidParameterException` (empty `userPoolId`). Added it manually; a fresh clone needs the same step (value is the same as `lynxbox-ph`'s `NEXT_PUBLIC_AWS_USER_POOL_ID` — not a secret, already exposed to browsers).
- **`api/local-server.ts`'s mock claims object silently dropped `cognito:groups` and `name`** from the decoded JWT — it only ever forwarded `sub`/`cognito:username`/`email`. This made the platform-admin dashboard 401 locally *even with correct real Cognito group membership*, since `isPlatformAdmin()` checks `claims['cognito:groups']`, which was never making it into the mocked event. Fixed by forwarding both through. This is now a standing rule in `CLAUDE.md`'s RBAC section: any future claim a handler reads must also be added to this mock, or local testing silently behaves as if that claim is always absent.
- **Invited users displayed a random UUID as their name** instead of anything readable, because `createCognitoUser` only set `email`/`email_verified` at creation — no `name` attribute — and the frontend's display-name fallback chain (`AuthContext.tsx`) lands on Cognito's internal auto-generated username (a UUID) when no `name` claim exists. Fixed by defaulting `name` to the invitee's email at creation time (`cognitoAdmin.ts`); they can change it later via the existing profile page. Only affects newly-invited users going forward, not already-invited ones.
- **Member `status` stayed `'invited'` forever** — nothing was flipping it to `'active'`, as flagged as a known gap when Phase 2 first shipped. Fixed with a low-cost approach instead of a Cognito trigger: `resolveActor()` now opportunistically (fire-and-forget, never blocking the request) flips `invited → active` in `MembershipRepository` the first time it resolves a membership still marked `invited` — a natural stand-in for "on first authenticated request" with no new infrastructure.
- **Platform-admin dashboard showed a raw Cognito `sub`** as the account label (`396a05ac-...`), not human-readable. Added `getCognitoUserEmail(sub)` to `cognitoAdmin.ts`: works because this User Pool's `username_attributes = ["email"]` config means the auto-generated internal `Username` Cognito assigns is the *same* UUID as `sub`, so a sub is a valid `AdminGetUser` lookup key. Used to enrich both `GET /api/platform-admin/dashboard/summary` and the account drill-in with `ownerEmail`, falling back to the raw `accountId` only if the lookup fails (e.g. a deleted user) — never blocks the page.
- **Added a "Members" count per account** (`memberCount` on `AccountSummary`, via `MembershipRepository.listByAccount` with the same 1-if-empty solo-account fallback used elsewhere) and a platform-wide **`totalUsers`** (`getUserPoolUserCount()` → Cognito's `DescribeUserPool.EstimatedNumberOfUsers`, needing a new `cognito-idp:DescribeUserPool` IAM permission alongside the existing Cognito admin actions). `totalUsers` is returned by the API but **deliberately not rendered** in the summary page per product decision — kept since it's cheap to compute, in case it's wanted later.
- **Role renamed `reader` → `viewer`** throughout (backend `Role` type in `api/src/lib/auth.ts` and `api/src/models/member.ts`, `INVITABLE_ROLES`, frontend `Role` type and the Team page's role dropdowns). Purely a naming change — no behavior, permission, or data-migration impact (no `role: 'reader'` rows existed yet to migrate).
- **Operational gotchas hit along the way** (Terraform var-files, a manually-pre-created Cognito group needing `terraform import` instead of delete+recreate, Lambda code deploys being a separate step from `terraform apply`) turned out to be general project knowledge, not RBAC-specific — documented in `CLAUDE.md`'s new "Infrastructure" section instead of duplicated here.
- **The `cognito:groups` claim-parsing assumption was wrong, and only surfaced once deployed to sandbox** — everything passed locally (where `local-server.ts`'s mock forwards the real decoded-JWT array untouched) and platform-admin still 401'd once actually deployed, even with correct group membership and a fresh sign-in. Root-caused via a diagnostic log of the raw claims object added to `PlatformAdminDashboardHandler.handle()` (kept in place — it only fires on a denied platform-admin check, rare enough to double as a useful audit trail), which showed the real value on CloudWatch: `"cognito:groups": "[platform-admin]"` — a bracket-wrapped, unquoted string, not the comma-joined format originally assumed (see the corrected parsing detail above). Two lessons: (1) this class of AWS-claims-serialization bug is fundamentally untestable locally, since the local mock never goes through API Gateway's actual claims serialization — sandbox/prod deployment is the only real test for anything touching `event.requestContext.authorizer.claims` formatting; (2) adding a cheap diagnostic log at the exact point of a suspected auth failure, rather than guessing again, turned a third guess into a one-shot fix once real evidence came back.

### Platform-admin account discovery and multi-account switching bugs found and fixed (2026-09-24)

Found while actually testing the platform-admin dashboard and multi-account membership against real signups, in the same extended session as the Payments and Subscription work above.

- **A brand-new signup was invisible on the platform-admin summary.** `getPlatformSummary()`'s Scan-based bucketing (section 3 above) only creates an account entry when it finds a `PROPERTY`/`TENANT`/`BUILDING`/`DOCUMENT`/`INVOICE` record carrying that `ownerId` — a fresh account with none of those yet (signup itself is 100% client-side Cognito, writing zero DynamoDB rows) simply never appears, no matter how long it's been since they signed up. Fixed by adding `listAllCognitoUsers()` (`api/src/lib/cognitoAdmin.ts`, paginated `ListUsersCommand`) — the real source of truth for "an account exists" — and merging it into `PlatformAdminDashboardHandler.getSummary()` as zero-activity rows for any Cognito user not already found by the scan. Needs a new `cognito-idp:ListUsers` IAM permission (added to `infra/modules/api/main.tf`'s `aws_iam_role_policy.lambda_cognito_admin`) — requires both `deploy-infra.ps1` (for the permission) and `deploy-lambda.ps1` (for the code) before this reaches sandbox/prod; local dev needs the same action granted to whatever AWS credentials `api/.env` uses.
- **Considered, then rejected: excluding a merged-in zero-activity account when its owner is also an invited member elsewhere** (to reduce "clutter" from invited staff who never use their own account). Rejected because there's no reliable signal to distinguish "purely invited staff, will never be a real customer" from "a genuine account owner who also happens to help manage a second account" — both look identical (zero business data + a membership row elsewhere), and hiding the wrong one would silently make a real account invisible again, the same bug just relocated. Every Cognito user is *always* implicitly the owner of their own account by this system's design (see the `resolveActor()` fix below), regardless of what else they're a member of — the two facts are independent, not exclusive.
- **Instead: a purely-presentational "Inactive" badge**, computed client-side in `dashboard/platform-admin/page.tsx` (`isAccountInactive()`) from data already in each row — `plan === 'free' && memberCount <= 1` and every one of properties/active-listings/buildings/tenants/documents/invoices is zero. Not a stored flag, not authoritative, just a quick visual heuristic layered on top of real columns already shown; a "Member of N other accounts" badge was tried first and explicitly reverted per product decision, in favor of this simpler criterion.
- **Added a "Signed Up" column and an "Active Listings" column** to the summary table, sourced from `listAllCognitoUsers()`'s `UserCreateDate` and a new `AccountSummary.activeListingCount` (same `status !== 'unlisted'` definition `BillingHandler.getUsage()` already used) respectively.
- **Two real bugs in `resolveActor()`/`listMemberships()` meant an invited member could never get back to their own account.** `MembershipRepository.listByUser(sub)` only returns *explicit* `MEMBER#` rows — a solo account never has one for itself. Both functions treated "my own account" as only a fallback for when the explicit list was completely empty, so the moment a user had *any* explicit membership elsewhere, their own account disappeared from consideration entirely: `listMemberships()` stopped returning it at all (so the account-switcher dropdown's `memberships.length > 1` check could drop back to a single entry and hide itself), and `resolveActor()`'s `X-Account-Id` lookup plus its owner-role fallback could never match it either, silently forcing every request back onto whichever explicit membership existed regardless of what was actually requested.
- **First fix attempt introduced a duplicate-account regression.** Unconditionally prepending `{ accountId: sub, role: 'owner' }` to the membership list fixed the above, but broke a different case: `AccountHandler.inviteMember()`'s first invite on a solo account *already* lazily creates the owner's own explicit `MEMBER#` row (so team-seat counting has something to count) — for any account that had ever invited a team member, this meant the synthetic entry duplicated a real one, and the switcher showed "My Account" twice instead of hiding (since `memberships.length` was artificially 2 for what should've been a single-account user). Caught immediately from a screenshot after deploying the first fix. Corrected in both `resolveActor()` and `listMemberships()` to only synthesize the entry when `explicitMemberships.some(m => m.accountId === sub)` is false — i.e., add it back only when it's truly missing, not unconditionally. `listMemberships()` also now returns each entry's real `ownerEmail` (via `getCognitoUserEmail` — safe to expose since the member already knows this account, they were invited into it), shown in the switcher dropdown instead of a truncated GUID.
- **`X-Account-Id` was missing from both CORS header allowlists**, so once a user actually had an active account switch stored (the bugs above meant this rarely fired before), every request carrying the header was blocked at the browser's preflight check before reaching the API at all — `Access to fetch ... has been blocked by CORS policy: Request header field x-account-id is not allowed`. Fixed in both `api/local-server.ts`'s hand-rolled CORS middleware and the real deployed `infra/modules/api/main.tf`'s `aws_apigatewayv2_api.cors_configuration.allow_headers` — same two-places-to-fix pattern this repo already has for routes, just for headers instead.
- **Switching accounts updated `AccountContext`'s own state but nothing else.** Every account-scoped page (dashboard stats, properties, invoices, billing) fetches its own data in a `useEffect` keyed on the Cognito `user`, not on the active account — since switching accounts doesn't change that user, none of those already-mounted pages knew to refetch, so the UI looked like switching did nothing even once the header itself was correct. Fixed with the standard multi-tenant pattern: `AccountContext.switchAccount()` now does a full `window.location.href` reload to `/dashboard` instead of only refreshing its own React state, rather than reworking every page's fetch effect to also depend on the active account.

---

## Implemented deviation: platform-admin gains more write actions (Payments and Subscription)

Not part of this plan — noted here since it directly amends decision #1 above, per this doc's own "do not re-litigate without updating this doc" rule. Decision #1 already covers platform-admin's actual first write action (the plan-toggle endpoint from `docs/Pricing-Strategy-Plan.md`). `docs/Payments-and-Subscription-Plan.md` (implemented 2026-09-24) added three *more* write actions to the platform-admin dashboard, in its own separate `paymentVerificationHandler.ts`: approving/rejecting a customer account's manually-submitted payment proof (GCash/bank transfer), manually extending a trial period case-by-case, and creating/deactivating promo codes. These are billing-verification actions on the account/subscription record only — they don't touch a customer's property/tenant/invoice/document data, don't reopen the impersonation question, and don't establish a general "platform-admin can edit anything" precedent.

## Related, deferred: signup verification email is unbranded Cognito mail

Not part of RBAC — noted here since it came up during this design and is planned as a follow-up **after** RBAC ships. Today, `infra/modules/auth/main.tf:39-41` has `email_sending_account = "COGNITO_DEFAULT"`, meaning the signup verification code is sent by Cognito's own built-in mailer: a generic, non-brandable sender address, and a shared sending quota (Cognito's default is roughly 50 emails/day for the whole user pool). Two ways to fix it when this gets picked up:

1. **Amazon SES** — `email_sending_account = "DEVELOPER"` + a `source_arn` for an SES-verified domain/email identity. Needs SES domain verification and a production-access request (accounts start in the SES sandbox, limited to pre-verified recipients).
2. **Route through the existing ZeptoMail setup** (used elsewhere for the marketing signup welcome email and the planned Phase 2 invite emails) — add a Cognito **Custom Message Lambda trigger** that suppresses Cognito's own send and dispatches the code via `ZeptoMailService` instead, keeping all outbound email on one provider/branding.

No decision made yet on which — revisit after RBAC.

## Files touched (Phase 1)

- `api/src/lib/auth.ts` — new
- `api/src/handlers/properties/handler.ts` — security fix + resolveActor refactor
- `api/src/handlers/{buildings,tenants,invoices,ledger,documents}/handler.ts` — resolveActor refactor (mechanical, same shape each time)
- `api/src/handlers/admin/propertyHandler.ts` — deleted
- `api/src/handlers/platformAdmin/dashboardHandler.ts` — new
- `api/src/repositories/platformAdminRepository.ts` — new
- `api/src/repositories/documentRepository.ts` — add `listByOwner(ownerId)` (currently only has `listByParent`)
- `api/serverless.yml`, `infra/modules/api/routes.tf`, `api/local-server.ts`, `api/src/index.ts` — new platform-admin routes
- `infra/modules/auth/main.tf` — new `aws_cognito_user_group.platform_admin`
- `lynxbox-ph/src/services/platformAdminService.ts`, `src/features/platform-admin/types.ts`, `src/app/dashboard/platform-admin/page.tsx` — new (nested under `/dashboard` — see deviation note above)
- `lynxbox-ph/src/app/dashboard/platform-admin/accounts/[accountId]/page.tsx` + `AccountDetailClient.tsx` — new. **This app builds with `output: 'export'` (`next.config.js`)**, so every dynamic `[param]` route needs a thin server `page.tsx` exporting `generateStaticParams()` (returning a single placeholder, e.g. `[{ accountId: '_' }]`) that delegates to a `'use client'` component receiving the param as a prop — a `'use client'` file cannot itself export `generateStaticParams`. This is the exact pattern already used by `dashboard/tenants/[id]` and `dashboard/invoices/[id]`; the first version of this page was written as a single client component directly in `page.tsx` and broke `next build` (`tsc --noEmit`/lint don't catch this class of error — only a real `next build` does). Follow this split for any future dynamic dashboard route.
- `lynxbox-ph/src/app/dashboard/DashboardSidebar.tsx`, `src/lib/auth.ts` (`getIsPlatformAdmin()`) — nav gating
- `lynxbox-ph/src/app/dashboard/profile/page.tsx`, `src/features/auth/AuthContext.tsx` — fix broken email-change verification flow (added `confirmUserAttribute`/`resendAttributeVerificationCode` to the auth context; `updateUserAttributes` now returns whether an attribute is pending confirmation instead of a bare boolean)

## Files touched (Phase 2)

- `api/src/lib/dynamodb.ts` — add `EntityType.MEMBER`
- `api/src/models/member.ts`, `api/src/repositories/membershipRepository.ts` — new
- `api/src/lib/auth.ts` — `resolveActor` now `async` with account-switching support; add `canWrite`/`canDestroy`/`canManageMembers`
- `api/src/lib/cognitoAdmin.ts` — new (`findCognitoUserByEmail`, `createCognitoUser`, `generateTemporaryPassword`)
- `api/src/lib/zeptomail.ts` — add `sendAccountInviteEmail`
- `api/src/handlers/account/handler.ts` — new (`me`, `memberships`, `members` CRUD)
- `api/src/handlers/{buildings,tenants,invoices,ledger,documents,properties}/handler.ts` — `await resolveActor`, add `canWrite`/`canDestroy` gates per endpoint
- `api/package.json` — new dependency `@aws-sdk/client-cognito-identity-provider`
- `api/serverless.yml`, `infra/modules/api/routes.tf`, `api/local-server.ts`, `api/src/index.ts` — new `/api/account/*` routes
- `api/serverless.yml`, `infra/modules/api/main.tf` — `USER_POOL_ID`/`FRONTEND_URL` env vars, Cognito admin IAM policy (`aws_iam_role_policy.lambda_cognito_admin` + new `data.aws_caller_identity.current`)
- `lynxbox-ph/src/features/account/{types.ts,AccountContext.tsx}`, `src/services/accountService.ts` — new
- `lynxbox-ph/src/lib/auth.ts` — `getActiveAccountId`/`setActiveAccountId`, `getAuthHeaders()` now attaches `X-Account-Id`
- `lynxbox-ph/src/components/providers.tsx` — wrap app in `AccountProvider`
- `lynxbox-ph/src/app/dashboard/DashboardSidebar.tsx` — account switcher `<Select>`, "Team" nav link
- `lynxbox-ph/src/app/dashboard/team/page.tsx` — new
- `lynxbox-ph/src/components/auth/NewPasswordChallenge.tsx` — new; `src/app/auth/signin/page.tsx` — wire up the new-password challenge
- `lynxbox-ph/src/app/dashboard/{buildings/page.tsx,tenants/page.tsx,tenants/[id]/TenantDetailClient.tsx,invoices/[id]/InvoiceDetailClient.tsx}`, `src/features/invoicing/components/{TenantList,InvoiceList}.tsx`, `src/features/documents/components/DocumentList.tsx`, `src/components/DashboardPropertyList.tsx` — role-gated write/destroy controls

## Verification

1. `npm run dev` in `api/` (serverless-offline via `local-server.ts`) — confirm existing endpoints (properties/tenants/invoices/etc.) still work identically after the `resolveActor` refactor, since `local-test-user-123` fallback must be preserved.
2. Direct API call (e.g. via curl/Postman, not the UI — there's no known UI path that exposes this) attempting to edit/delete a property owned by a different `ownerId`: confirm it now returns `forbidden` instead of succeeding (regression test for the security fix).
3. In the profile page, change the email address and confirm a verification code is actually sent to the new address and the email only updates in Cognito after entering it (regression test for the profile email-change fix).
4. Deploy to sandbox via `infra/scripts/deploy-infra.ps1` (needs live AWS SSO session) to apply the Terraform changes (new Cognito group + platform-admin routes + Phase 2's Cognito admin IAM policy).
5. Add your sandbox Cognito user to the `platform-admin` group via `aws cognito-idp admin-add-user-to-group --user-pool-id <id> --username <your-email> --group-name platform-admin`, sign out/in in the frontend (ID tokens are valid 60 minutes and won't pick up the new group until refreshed), and confirm the admin dashboard link appears at `/dashboard/platform-admin` and `GET /api/platform-admin/dashboard/summary` returns real counts.
6. Confirm a non-admin user does **not** see the admin nav link and gets `unauthorized` calling the platform-admin endpoints directly.
7. Set `USER_POOL_ID` (and confirm the deployed Lambda role has the new Cognito admin IAM policy attached), then invite a real email address via the Team page. Confirm: the invite email arrives with a working temporary password, signing in triggers the new-password challenge, and after setting a password the invited user lands on the dashboard.
8. As the invited user, confirm role-appropriate UI: a `viewer` sees no create/edit/delete controls anywhere; a `manager`/`staff` sees create/edit but not delete/void/reset-ledger.
9. Invite a person who already has their own separate Lynxbox account; confirm they get an account-switcher dropdown and can move between both accounts, with `X-Account-Id` correctly scoping every request server-side (try requesting an account they don't belong to and confirm it's ignored, not honored).
10. As the owner, remove a member and confirm they immediately lose access on their next request (no logout needed, since roles are DB-backed per the earlier design decision — this is the intended behavior, not a bug if it applies without their needing to sign out).

## Implementation notes (2026-09-23)

- Backend (`api/`) type-checks cleanly (`npx tsc --noEmit`); frontend (`lynxbox-ph/`) type-checks and lints cleanly for all changed/new files, including after the separate agent-driven UI-gating pass (verified independently, not just taken on faith).
- `infra/` validates cleanly (`terraform validate`) — **not** applied to any real environment; that's a manual step for you via `infra/scripts/deploy-infra.ps1` once you're ready, since it needs a live AWS SSO session and actually changes deployed infrastructure.
- While fixing the property ownership bug, found and fixed a related gap: `updateProperty` ran S3 image deletion *before* even fetching the property record, so the ownership check had to be moved to the very top of the method (before any side effect), not just added as a final guard — otherwise a crafted request could still trigger deletion of another owner's S3 images before hitting the `forbidden` response.
- `AuthContext.tsx` had two dead/shadowed imports (`updateUserAttribute` singular, and an unaliased `updateUserAttributes`) cleaned up as part of the email-fix edit.
- Neither phase has been tested end-to-end against live AWS (no deploy has happened yet) — treat the Verification steps above as the checklist for that first real test pass, not as things already confirmed working.
