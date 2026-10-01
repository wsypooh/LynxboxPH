# Cognito Email Triggers — ZeptoMail-branded Verification Codes + New-Signup Notification — Plan

**Status: not yet implemented.** Scoped and reviewed (see "How this was validated" below) but no code or infra has been written. This doc exists so whoever picks this up next doesn't have to re-derive the design — in particular the correction in the first Decision below, which gates the whole approach.

## Context

Today Cognito sends every verification-code email itself (`email_sending_account = "COGNITO_DEFAULT"` in `infra/modules/auth/main.tf`) — a generic, unbranded sender address and a shared ~50/day sending quota for the whole user pool. This covers four user-facing flows, all pure client-side Amplify calls with zero backend involvement today:
- Signup confirmation (`lynxbox-ph/src/app/auth/signup/page.tsx` + `confirm-signup/page.tsx` — `signUp()`/`confirmSignUp()`/`resendSignUpCode()`)
- Forgot-password (`lynxbox-ph/src/app/auth/forgot-password/page.tsx`)
- Profile email-change, both the initial code and its resend button (`lynxbox-ph/src/features/auth/AuthContext.tsx`'s `updateUserAttributes`/`resendAttributeVerificationCode`, wired into `dashboard/profile/page.tsx`)

`docs/RBAC-Admin-Plan.md`'s "Related, deferred" section already flagged this as a follow-up, describing the fix as a "Custom Message Lambda trigger that suppresses Cognito's own send." **That description is wrong and should not be followed as written** — see Decision 1.

Separately, there's currently no way to learn about a new signup except by checking the platform-admin dashboard. A Cognito **Post Confirmation** trigger (fires once, right after a user confirms their signup code) can fire an internal notification email, reusing `ZeptoMailService.sendInternalNotification()` — the same method the marketing-lead `/api/signup` endpoint (`api/src/handlers/signup/handler.ts`, used by `/app/business-address`) already calls for every lead.

Both triggers configure on the same Cognito User Pool resource and can point at the same existing API Lambda — same pattern already used for the daily subscription cron (`infra/modules/api/cron.tf`, one Lambda invoked via a synthetic event, branched on in `api/src/index.ts` before normal path routing) — so this is one combined change, not two unrelated features.

**Why this needs real planning, not a quick edit:** it touches the auth system every user goes through (signup, password reset, email change) across sandbox *and* prod, needs a new KMS key plus IAM wiring with a real (if narrow) Terraform module-cycle risk, introduces a new npm dependency, and **is not testable locally** — `api/local-server.ts` has no way to simulate a Cognito trigger invocation, so every flow can only be verified against a real deployed sandbox user pool.

## Decisions

1. **Use the Custom Email Sender trigger, not Custom Message.** The Custom Message trigger can only reword the content of the email Cognito itself still sends via its own configured mailer — it has no ability to suppress Cognito's native send or hand delivery to a third party. The **Custom Email Sender** trigger is the only mechanism that fully replaces native delivery: Cognito hands your Lambda a KMS-encrypted code instead of sending anything itself, and your Lambda is responsible for decrypting it (AWS Encryption SDK) and sending the actual email. This is a meaningfully bigger lift than the original doc's note implied — a new KMS key, a new npm dependency, and a pool-wide switch (see Decision 3) — not a one-line trigger wire-up.

2. **Brand all four code-sending flows now** (signup/resend, forgot-password, profile email-change-initial, profile email-change-resend), not just signup. This was a deliberate choice (asked and confirmed) over doing signup only with placeholder copy for the rest — see Decision 3 for why a narrower scope doesn't actually save implementation work, only copywriting effort.

3. **Once the Custom Email Sender trigger is enabled, it's a pool-wide switch — all 8 of Cognito's `CustomEmailSender_*` trigger sources route through the one Lambda, whether handled or not; unhandled ones simply never get an email sent.** The eight sources: `SignUp`, `ResendCode`, `ForgotPassword`, `UpdateUserAttribute` (profile email-change, first send), `VerifyUserAttribute` (profile email-change, **resend** — a distinct trigger source from `UpdateUserAttribute`, both need explicit handling or the resend button silently breaks), `AdminCreateUser`, `Authentication` (email OTP/MFA at sign-in), `AccountTakeOverNotification` (Advanced Security threat notifications). Only the first five apply to anything this app currently does — `Authentication`/`AccountTakeOverNotification` don't apply today (TOTP-only MFA, no Advanced Security configured) and `AdminCreateUser` already has its own working branded email (`ZeptoMailService.sendAccountInviteEmail`, sent directly by `api/src/handlers/account/handler.ts`'s invite flow via `cognitoAdmin.ts`'s `MessageAction: 'SUPPRESS'`) — but the new trigger handler must still have an explicit no-op branch for all three, or an exception there could surface back to the end user's `signUp()`/`resetPassword()`/etc. call in the browser. (It's plausible, based on how `MessageAction: 'SUPPRESS'` is generally documented, that `CustomEmailSender_AdminCreateUser` doesn't even fire for the existing invite flow since there's no native send event to intercept — not confirmed against AWS's docs in so many words, treat as "probably true, verify once in sandbox," keep the no-op branch regardless since it's cheap and defensive.)

4. **`event.triggerSource` is the only safe discriminator** — `event.request.type` is a constant (`"customEmailSenderRequestV1"`, the payload schema version) present on every invocation, not a flow indicator. `event.request.clientMetadata` is present only for `SignUp`/`ForgotPassword`/`Authentication` — don't rely on it existing in shared code that runs for every trigger source.

5. **`PostConfirmation_ConfirmSignUp` must be distinguished from `PostConfirmation_ConfirmForgotPassword`** — both land on the same `lambda_config.post_confirmation` slot. Without an explicit triggerSource check, every password reset would also fire a spurious "new signup" internal notification.

## Design

### Terraform module-cycle problem and its fix

`module.auth` (creates the user pool, `infra/modules/auth/main.tf`) is applied before `module.api` (creates the Lambda, `infra/modules/api/main.tf`) in root `infra/main.tf` — `module.api` already depends on `module.auth.user_pool_id`/`user_pool_client_id`. Adding `lambda_config` to the user pool needs the **Lambda's ARN and its execution role's ARN**. Fetching either via a real module-output reference (`module.api.*`) would create a second dependency edge in the opposite direction — a genuine cycle that Terraform refuses to plan.

Fix: both ARNs are fully deterministic from inputs the auth module already receives, so construct them as plain strings inside the auth module instead of module-output references (no graph edge created, no cycle):

```hcl
data "aws_caller_identity" "current" {}  # new in auth module

locals {
  api_lambda_arn      = "arn:aws:lambda:${var.region}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-api-${var.environment}"
  api_lambda_role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-lambda-role-${var.environment}"
}
```

(Matches `infra/modules/api/main.tf`'s existing `aws_lambda_function.api`'s `function_name = "${var.project_name}-api-${var.environment}"` and `aws_iam_role.lambda`'s `name = "${var.project_name}-lambda-role-${var.environment}"` exactly — confirmed by reading both resources.)

The reverse direction (api module needing things from auth) stays as ordinary module outputs — same direction as the existing `user_pool_id` wiring, not circular: a new `kms_key_arn` output (see below), and `user_pool_arn` (**already exported** at `infra/modules/auth/main.tf:219-222` — no change needed there).

**Known, accepted limitation:** on a hypothetical from-scratch environment stand-up (not a concern for sandbox/prod, which already exist), Terraform has no edge forcing the Lambda to exist before the user pool's `lambda_config` is written, since the ARNs are plain strings. Cognito accepts the `lambda_config` regardless — it doesn't validate the ARN resolves at config-write time — so the worst case is trigger invocations failing until the same `apply` run finishes creating the Lambda too, which is self-healing and doesn't block `terraform apply` itself. Not worth an explicit `depends_on` (it would recreate the cycle problem for a scenario that doesn't exist today).

### KMS key (new, lives in the auth module)

The Custom Email Sender trigger needs a customer-managed symmetric key — Cognito encrypts the code with it, the Lambda decrypts it. Critically, **Cognito does not hold a standing grant on the key**: per AWS's docs, the IAM principal that runs `UpdateUserPool`/`CreateUserPool` (i.e. whatever credentials `terraform apply` uses) needs `kms:CreateGrant` on the key, requested fresh on every such call, not just once at creation.

```hcl
resource "aws_kms_key" "cognito_email_sender" {
  description = "Decrypt key for Cognito Custom Email Sender trigger (${var.environment})"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowAccountRootFullAccess"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid       = "AllowLambdaDecrypt"
        Effect    = "Allow"
        Principal = { AWS = local.api_lambda_role_arn }
        Action    = "kms:Decrypt"
        Resource  = "*"
      }
    ]
  })
}
```

The root-account statement is the standard KMS default-policy grant — it delegates `kms:CreateGrant` authorization to whatever IAM policy the deploy credentials already carry, avoiding a hardcoded, per-environment, possibly-unknown deploy-user ARN (this Terraform's AWS provider authenticates as a static IAM user via `var.aws_access_key`/`var.aws_secret_key`, not an assumed role — see `infra/main.tf`'s provider block and the `TF_VAR_aws_access_key`/`TF_VAR_aws_secret_key` convention noted elsewhere in this repo's CLAUDE.md).

**Open item, to confirm once before implementing, not a blocker to writing the code:** verify the IAM user behind each environment's deploy credentials actually has `kms:CreateGrant` via its attached policy. If it turns out to be narrowly scoped rather than broad/admin-equivalent, swap the root-account statement for one naming that specific user's ARN instead.

New auth-module output: `kms_key_arn`.

### Lambda IAM (api module)

New `aws_iam_role_policy` (sibling to the existing `lambda_cognito_admin`/`lambda_s3_csv` policies in `infra/modules/api/main.tf`), granting only `kms:Decrypt` on the new `var.kms_key_arn` input — no `kms:Encrypt` needed, the Lambda only decrypts. This duplicates what the key policy's `AllowLambdaDecrypt` statement above already grants; keep both, matching how every other Lambda permission in this codebase is declared explicitly in the api module rather than relied on implicitly from elsewhere.

New `aws_lambda_permission` (same shape as the existing `api_gw` permission and `cron.tf`'s `allow_eventbridge_subscription_check`):

```hcl
resource "aws_lambda_permission" "allow_cognito_invoke" {
  statement_id  = "AllowCognitoInvokeApiLambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = var.user_pool_arn
}
```

One permission covers both `CustomEmailSender` and `PostConfirmation` invocations (same pool, same function) — no need for two.

New api-module input variables: `kms_key_arn`, `user_pool_arn` (added to `infra/modules/api/variables.tf` alongside the existing `user_pool_id`/`user_pool_client_id` variables).

### `infra/modules/auth/main.tf`'s `aws_cognito_user_pool.main` — add `lambda_config`

```hcl
lambda_config {
  kms_key_id        = aws_kms_key.cognito_email_sender.arn
  post_confirmation = local.api_lambda_arn

  custom_email_sender {
    lambda_arn     = local.api_lambda_arn
    lambda_version = "V1_0"
  }
}
```

### `infra/main.tf` root wiring

`module "api"` gains two new inputs: `kms_key_arn = module.auth.kms_key_arn`, `user_pool_arn = module.auth.user_pool_arn`. `module "auth"` needs no new inputs — everything it needs is now constructed internally from variables it already has. Add `COGNITO_EMAIL_SENDER_KMS_KEY_ARN = module.auth.kms_key_arn` to the `environment_variables` map passed into `module "api"` — see the deployment gotcha below for why this alone won't reach the already-deployed Lambda.

### Lambda trigger event handling (`api/`)

Cognito trigger events carry no `path`/`httpMethod`; they're discriminated by `triggerSource`. In `api/src/index.ts`, add a branch before the existing `event.source === 'lynxboxph.scheduler'` check (order between the two synthetic-event checks doesn't matter, but both must precede the `event.path`-based chain):

```ts
if (event.triggerSource) {
  return await CognitoTriggerHandler.handle(event);
}
```

Cognito requires the **original event object returned**, not an `APIGatewayProxyResult` — loosen `handler()`'s return type for this branch accordingly.

New file `api/src/handlers/cognitoTriggers/handler.ts`, switching on `event.triggerSource`:
- `CustomEmailSender_SignUp`, `CustomEmailSender_ResendCode` → decrypt code, send branded "verify your email" template.
- `CustomEmailSender_ForgotPassword` → decrypt code, send branded "reset your password" template.
- `CustomEmailSender_UpdateUserAttribute` → decrypt code, send branded "confirm your new email" template (profile email-change, first send).
- `CustomEmailSender_VerifyUserAttribute` → same template as above, the resend-button path.
- `CustomEmailSender_AdminCreateUser`, `CustomEmailSender_Authentication`, `CustomEmailSender_AccountTakeOverNotification` → explicit no-op, return event unmodified (see Decision 3).
- `PostConfirmation_ConfirmSignUp` → fire-and-forget `ZeptoMailService.sendInternalNotification(...)`, return event unmodified. Must exclude `PostConfirmation_ConfirmForgotPassword` (see Decision 5).
- Decrypt helper, reused by every `CustomEmailSender_*` branch:
  ```ts
  import { KmsKeyringNode, buildClient, CommitmentPolicy } from '@aws-crypto/client-node';
  const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT);
  const keyring = new KmsKeyringNode({
    generatorKeyId: process.env.COGNITO_EMAIL_SENDER_KMS_KEY_ARN!,
    keyIds: [process.env.COGNITO_EMAIL_SENDER_KMS_KEY_ARN!],
  });
  const { plaintext } = await decrypt(keyring, Buffer.from(event.request.code, 'base64'));
  const code = Buffer.from(plaintext).toString('utf-8');
  ```
- Never throw — catch and return `event` unmodified on any error (see Decision 3's framing of why an exception here is user-facing, not just a log line).

### `api/src/lib/zeptomail.ts`

New methods for the branded code emails, following the exact existing pattern used by every other method here (soft-fail if `ZEPTOMAIL_SMTP_KEY`/`ZEPTOMAIL_API_KEY` is unset, then `this.transporter.sendMail(...)` via the existing `wrapSimpleEmail(heading, bodyHtml)` helper, same as `sendTrialEndingSoonEmail` etc.): one for signup/resend, one for forgot-password, one for email-change (shared by both its trigger sources). `sendInternalNotification()` needs no changes — it's already generic enough; just call it with a `source` like `'account-signup'` from the new handler.

### New dependency

`@aws-crypto/client-node` — confirmed absent from `api/package.json` today. Plain npm package, no native binary (unlike `sharp`, which needs the `--os=linux` deploy-dir-only handling called out elsewhere in this repo's docs) — `npm ci --omit=dev` in `deploy-lambda.ps1` would pick it up automatically once added as a normal `dependencies` entry.

## Critical files (when this gets implemented)

- `infra/modules/auth/main.tf` — KMS key + policy, `data.aws_caller_identity`, locals for the two ARN strings, `lambda_config` block, new `kms_key_arn` output
- `infra/modules/api/main.tf` — new IAM policy, new `aws_lambda_permission`
- `infra/modules/api/variables.tf` — new `kms_key_arn`/`user_pool_arn` input variables
- `infra/main.tf` — wire the two new `module.api` inputs, add the KMS ARN env var
- `api/src/index.ts` — new `event.triggerSource` branch before path-based dispatch
- `api/src/handlers/cognitoTriggers/handler.ts` — new file, all trigger-source branching + decrypt
- `api/src/lib/zeptomail.ts` — new branded-email methods, reuse existing `wrapSimpleEmail`/`sendInternalNotification`
- `api/package.json` — new dependency

## Deployment gotchas (will bite whoever implements this if skipped)

1. **New env vars don't reach the live Lambda via `terraform apply`.** `aws_lambda_function.api` has `lifecycle { ignore_changes = [..., environment] }` — so `COGNITO_EMAIL_SENDER_KMS_KEY_ARN` must be added to the already-deployed dev/prod functions manually, via a full get-then-merge-then-put (never a hand-typed `--environment Variables={...}`, which replaces the whole map and would wipe existing secrets like `ZEPTOMAIL_API_KEY`):
   ```powershell
   aws lambda get-function-configuration --function-name lynxbox-ph-api-dev --region ap-southeast-1 --query "Environment" --output json > env-dev.json
   # merge the new key into env-dev.json's Variables (script or by hand, carefully)
   aws lambda update-function-configuration --function-name lynxbox-ph-api-dev --region ap-southeast-1 --environment file://env-dev.json
   # verify an existing secret survived, then delete env-dev.json (it now holds every live secret in plaintext)
   ```
2. **Rollback:** removing the `lambda_config` block and re-applying reverts the pool to native `COGNITO_DEFAULT` mail immediately. If only the Custom Email Sender half needs to be killed (ZeptoMail sending broken) while keeping the signup-notification half alive, remove just the `custom_email_sender`/`kms_key_id` lines and leave `post_confirmation` in place — both triggers share one `lambda_config` block.

## Verification plan (must be sandbox — no local simulation exists)

1. `terraform apply` against dev only first (KMS key, IAM, `lambda_config`, new permission).
2. `deploy-lambda.ps1 -Environment dev`, then the manual env-var merge above.
3. Exercise all five code paths with a disposable test account against the real dev user pool: sign up (SignUp), resend the code (ResendCode), forgot-password (ForgotPassword), change profile email (UpdateUserAttribute) and separately hit its resend button (VerifyUserAttribute) — watch CloudWatch Logs on the Lambda for decrypt/send errors on each.
4. Confirm the signup also fires exactly one internal notification, and that a separate forgot-password test does *not* also fire one (validates the `ConfirmSignUp` vs `ConfirmForgotPassword` guard from Decision 5).
5. Send one more team invite (`AdminCreateUser` path) and confirm it's unaffected — still arrives via the existing `sendAccountInviteEmail`, not double-sent.
6. Only after all of the above pass in dev, repeat against prod (`terraform apply`, `deploy-lambda.ps1 -Environment prod`, manual env-var merge), then one real signup in prod as a final smoke test.

## How this was validated

This design was scoped conversationally, then cross-checked against the live AWS Cognito Developer Guide (not training memory) to correct the original "Custom Message" framing and nail the exact trigger-source list, event shape, and KMS grant mechanics. The Terraform module-cycle fix and file-by-file change list were reviewed in a second pass against the actual current contents of every file named above. Nothing has been applied — this is the design to implement from, not a record of what exists.
