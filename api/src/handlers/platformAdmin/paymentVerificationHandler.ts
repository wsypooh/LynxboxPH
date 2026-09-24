import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../../lib/apiResponse';
import { isPlatformAdmin } from '../../lib/auth';
import { PaymentSubmissionRepository } from '../../repositories/paymentSubmissionRepository';
import { PromoCodeRepository } from '../../repositories/promoCodeRepository';
import { normalizeCode } from '../../models/promoCode';
import { AccountRepository } from '../../repositories/accountRepository';
import { PaymentSubmissionStatus } from '../../models/paymentSubmission';
import { PaidPlan } from '../../models/account';
import { resolvePromoForAccount } from '../../lib/pricing';
import { ZeptoMailService } from '../../lib/zeptomail';
import { getCognitoUserEmail } from '../../lib/cognitoAdmin';
import { S3Service } from '../../lib/s3';

const mailer = new ZeptoMailService();
const PAID_PLANS: PaidPlan[] = ['starter', 'growth', 'business'];

function getSubmissionId(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/platform-admin\/payment-submissions\/([^/]+)\/(approve|reject|view-url)$/);
  return match ? match[1] : null;
}

function getAccountIdForExtendTrial(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/platform-admin\/accounts\/([^/]+)\/extend-trial$/);
  return match ? match[1] : null;
}

function getPromoCode(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/platform-admin\/promo-codes\/([^/]+)\/deactivate$/);
  return match ? match[1] : null;
}

function getPromoCodeForUpdate(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/platform-admin\/promo-codes\/([^/]+)$/);
  return match ? match[1] : null;
}

// Only one auto-apply promo should ever be effectively active for a given moment — it's
// meant to be THE sitewide price shown to everyone, and PromoCodeRepository.findActiveAutoApply()
// has no defined tie-break if two match simultaneously (a Scan's return order isn't
// meaningful). Manually-entered codes have no such limit — multiple targeted campaigns can
// run active simultaneously. Compares date WINDOWS, not just the active/autoApply flags,
// so a future-scheduled promo (startsAt in the future) can be created ahead of time
// without conflicting with one that's currently running and will have expired by then.
function windowsOverlap(aStart: string | undefined, aEnd: string | undefined, bStart: string | undefined, bEnd: string | undefined): boolean {
  const aStartMs = aStart ? new Date(aStart).getTime() : -Infinity;
  const aEndMs = aEnd ? new Date(aEnd).getTime() : Infinity;
  const bStartMs = bStart ? new Date(bStart).getTime() : -Infinity;
  const bEndMs = bEnd ? new Date(bEnd).getTime() : Infinity;
  return aStartMs < bEndMs && bStartMs < aEndMs;
}

async function findConflictingAutoApplyCode(
  excludeCode: string,
  willBeAutoApply: boolean,
  willBeActive: boolean,
  startsAt?: string,
  expiresAt?: string
): Promise<string | null> {
  if (!willBeAutoApply || !willBeActive) return null;
  const normalizedExclude = normalizeCode(excludeCode);
  const all = await PromoCodeRepository.listAll();
  const conflict = all.find(p =>
    p.code !== normalizedExclude &&
    p.autoApply &&
    p.active &&
    windowsOverlap(startsAt, expiresAt, p.startsAt, p.expiresAt)
  );
  return conflict ? conflict.code : null;
}

// isPlatformAdmin(event) is a bare claims check, not a full resolveActor() — this handler
// isn't scoped to any one account, same as PlatformAdminDashboardHandler. Inlined here
// rather than exporting auth.ts's private getSub(), since it's only ever used for this
// one audit-trail field.
function getPlatformAdminSub(event: APIGatewayProxyEvent): string {
  const claims = event.requestContext.authorizer?.claims;
  return claims?.sub || claims?.['cognito:username'] || 'unknown-platform-admin';
}

// Kept separate from PlatformAdminDashboardHandler (which owns the pre-existing,
// narrower read-only + plan-toggle surface) since this adds a meaningfully larger set of
// write actions — payment verification, trial extension, promo codes. See
// docs/RBAC-Admin-Plan.md's "Planned deviation" note.
export class PaymentVerificationHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (!isPlatformAdmin(event)) {
      return ApiResponse.unauthorized('Platform admin access required');
    }

    const method = event.httpMethod;
    const path = event.path;

    try {
      if (method === 'POST' && path.match(/\/api\/platform-admin\/payment-submissions\/[^/]+\/approve$/)) {
        return await PaymentVerificationHandler.approve(event);
      } else if (method === 'POST' && path.match(/\/api\/platform-admin\/payment-submissions\/[^/]+\/reject$/)) {
        return await PaymentVerificationHandler.reject(event);
      } else if (method === 'GET' && path.match(/\/api\/platform-admin\/payment-submissions\/[^/]+\/view-url$/)) {
        return await PaymentVerificationHandler.getProofViewUrl(event);
      } else if (method === 'GET' && path.match(/\/api\/platform-admin\/payment-submissions$/)) {
        return await PaymentVerificationHandler.listSubmissions(event);
      } else if (method === 'POST' && path.match(/\/api\/platform-admin\/accounts\/[^/]+\/extend-trial$/)) {
        return await PaymentVerificationHandler.extendTrial(event);
      } else if (method === 'PUT' && path.match(/\/api\/platform-admin\/promo-codes\/[^/]+\/deactivate$/)) {
        return await PaymentVerificationHandler.deactivatePromoCode(event);
      } else if (method === 'PUT' && path.match(/\/api\/platform-admin\/promo-codes\/[^/]+$/)) {
        return await PaymentVerificationHandler.updatePromoCode(event);
      } else if (method === 'GET' && path.match(/\/api\/platform-admin\/promo-codes$/)) {
        return await PaymentVerificationHandler.listPromoCodes();
      } else if (method === 'POST' && path.match(/\/api\/platform-admin\/promo-codes$/)) {
        return await PaymentVerificationHandler.createPromoCode(event);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('PaymentVerificationHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async getProofViewUrl(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const id = getSubmissionId(event);
    if (!id) return ApiResponse.notFound('Payment submission not found');

    const submission = await PaymentSubmissionRepository.findById(id);
    if (!submission) return ApiResponse.notFound('Payment submission not found');

    const s3Service = new S3Service();
    const { url } = await s3Service.getPresignedViewUrl(submission.proofS3Key, 3600, submission.proofFileName);
    return ApiResponse.success({ url });
  }

  static async listSubmissions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const status = event.queryStringParameters?.status as PaymentSubmissionStatus | undefined;
    const submissions = await PaymentSubmissionRepository.listByStatus(status || 'pending');

    // Best-effort, same pattern as PlatformAdminDashboardHandler.getSummary — a lookup
    // failure (e.g. a deleted user) falls back to null, never blocks the queue.
    const enriched = await Promise.all(submissions.map(async s => ({
      ...s,
      accountEmail: await getCognitoUserEmail(s.accountId).catch(() => null),
    })));

    return ApiResponse.success({ submissions: enriched });
  }

  static async approve(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const id = getSubmissionId(event);
    if (!id) return ApiResponse.notFound('Payment submission not found');

    const submission = await PaymentSubmissionRepository.findById(id);
    if (!submission || submission.status !== 'pending') {
      return ApiResponse.error('Submission not found or already processed', 400);
    }

    const account = await AccountRepository.getPlan(submission.accountId);
    let promoPeriodsRemaining: number | undefined;
    let promoCodeToApply: string | undefined;

    if (submission.promoCode) {
      const rawPromo = await PromoCodeRepository.findByCode(submission.promoCode);
      const { promo, periodsRemainingBeforeUse } = resolvePromoForAccount(account, rawPromo);
      if (promo) {
        await PromoCodeRepository.incrementRedemptionCount(promo.code);
        const remainingAfterThisUse = periodsRemainingBeforeUse - 1;
        if (remainingAfterThisUse > 0) {
          promoPeriodsRemaining = remainingAfterThisUse;
          promoCodeToApply = promo.code;
        }
      }
    }

    const periodDays = submission.requestedBillingCycle === 'annual' ? 365 : 30;
    // docs/Payments-and-Subscription-Plan.md — an early renewal stacks onto the existing
    // period instead of resetting it, so paying before the due date never forfeits
    // already-paid-for days. Only a genuine renewal qualifies: same plan, same billing
    // cycle, currently active, and the existing period hasn't lapsed yet. A plan/cycle
    // change, a first payment out of trial, or a renewal after lapsing always starts the
    // new period from the approval moment (no proration for those, by design).
    const isStackableRenewal = account.subscriptionStatus === 'active'
      && account.plan === submission.requestedPlan
      && account.billingCycle === submission.requestedBillingCycle
      && !!account.currentPeriodEnd
      && new Date(account.currentPeriodEnd) > new Date();

    const updated = await AccountRepository.applyVerifiedPayment(submission.accountId, {
      plan: submission.requestedPlan,
      billingCycle: submission.requestedBillingCycle,
      periodDays,
      stackFrom: isStackableRenewal ? account.currentPeriodEnd : undefined,
      verifiedSubmissionId: submission.id,
      promoCode: promoCodeToApply,
      promoPeriodsRemaining,
    });

    await PaymentSubmissionRepository.update(id, {
      status: 'verified',
      verifiedBySub: getPlatformAdminSub(event),
      verifiedAt: new Date().toISOString(),
    });

    try {
      const email = await getCognitoUserEmail(submission.accountId);
      if (email) await mailer.sendPaymentVerifiedEmail(email, submission.requestedPlan, updated.currentPeriodEnd!);
    } catch (err) {
      console.error(`Failed to send payment-verified email for account ${submission.accountId}:`, err);
    }

    return ApiResponse.success({ account: updated });
  }

  static async reject(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const match = event.path.match(/\/api\/platform-admin\/payment-submissions\/([^/]+)\/reject$/);
    const id = match ? match[1] : null;
    if (!id) return ApiResponse.notFound('Payment submission not found');

    const submission = await PaymentSubmissionRepository.findById(id);
    if (!submission || submission.status !== 'pending') {
      return ApiResponse.error('Submission not found or already processed', 400);
    }

    const body = JSON.parse(event.body || '{}');
    const reason = (body.reason as string) || 'Payment could not be verified.';

    await PaymentSubmissionRepository.update(id, {
      status: 'rejected',
      adminNotes: reason,
      verifiedBySub: getPlatformAdminSub(event),
      verifiedAt: new Date().toISOString(),
    });

    try {
      const email = await getCognitoUserEmail(submission.accountId);
      if (email) await mailer.sendPaymentRejectedEmail(email, reason);
    } catch (err) {
      console.error(`Failed to send payment-rejected email for account ${submission.accountId}:`, err);
    }

    return ApiResponse.success({ id, status: 'rejected' });
  }

  static async extendTrial(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const accountId = getAccountIdForExtendTrial(event);
    if (!accountId) return ApiResponse.notFound('Account not found');

    const body = JSON.parse(event.body || '{}');
    const newTrialEndsAt = body.trialEndsAt as string | undefined;
    const notes = body.notes as string | undefined;
    const plan = body.plan as PaidPlan | undefined;
    if (!newTrialEndsAt) return ApiResponse.error('trialEndsAt is required');

    const account = await AccountRepository.getPlan(accountId);

    // Simple extension while already trialing needs nothing else. A lapsed trial
    // (reverted to Free/past_due, with no memory of what it was trialing) needs an
    // explicit plan to re-grant one — this is an admin override, so it deliberately
    // bypasses hasUsedTrial (see AccountRepository.extendTrial).
    if (account.subscriptionStatus !== 'trialing') {
      if (!plan || !PAID_PLANS.includes(plan)) {
        return ApiResponse.error(`This account is not currently trialing — specify a plan (one of: ${PAID_PLANS.join(', ')}) to start a new trial for it`, 400);
      }
    }

    const updated = await AccountRepository.extendTrial(accountId, newTrialEndsAt, notes, plan);
    return ApiResponse.success({ account: updated });
  }

  static async listPromoCodes(): Promise<APIGatewayProxyResult> {
    const codes = await PromoCodeRepository.listAll();
    return ApiResponse.success({ codes });
  }

  static async createPromoCode(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const body = JSON.parse(event.body || '{}');
    const { code, discountType, discountValue, durationPeriods, autoApply, applicablePlans, maxRedemptions, startsAt, expiresAt, notes } = body;

    if (!code || !discountType || discountValue === undefined) {
      return ApiResponse.error('code, discountType and discountValue are required');
    }
    if (discountType !== 'percent' && discountType !== 'fixed') {
      return ApiResponse.error('discountType must be percent or fixed');
    }
    if (startsAt && expiresAt && new Date(startsAt).getTime() >= new Date(expiresAt).getTime()) {
      return ApiResponse.error('startsAt must be before expiresAt');
    }

    const existing = await PromoCodeRepository.findByCode(code);
    if (existing) return ApiResponse.error('A promo code with this code already exists', 409);

    const conflict = await findConflictingAutoApplyCode(code, !!autoApply, true, startsAt, expiresAt);
    if (conflict) {
      return ApiResponse.error(`"${conflict}" is already the active auto-apply promo during that period — deactivate it or adjust the dates first.`, 409);
    }

    const created = await PromoCodeRepository.create({
      code,
      discountType,
      discountValue,
      durationPeriods: durationPeriods || 1,
      autoApply: !!autoApply,
      applicablePlans,
      maxRedemptions,
      startsAt,
      expiresAt,
      active: true,
      notes,
    });

    return ApiResponse.success({ code: created });
  }

  // Edits everything except the code itself (the natural key) — changing the code would
  // mean creating a new record, not updating this one. Also how a deactivated code gets
  // reactivated (set active: true), since that's just another field on the same update.
  static async updatePromoCode(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const code = getPromoCodeForUpdate(event);
    if (!code) return ApiResponse.notFound('Promo code not found');

    const body = JSON.parse(event.body || '{}');
    const { discountType, discountValue, durationPeriods, autoApply, applicablePlans, maxRedemptions, startsAt, expiresAt, active, notes } = body;

    if (discountType !== undefined && discountType !== 'percent' && discountType !== 'fixed') {
      return ApiResponse.error('discountType must be percent or fixed');
    }

    const existing = await PromoCodeRepository.findByCode(code);
    if (!existing) return ApiResponse.notFound('Promo code not found');

    // Resolve the state this update would RESULT in (merging with what's already
    // stored) before checking for a conflicting auto-apply code — covers reactivating
    // a code (active: true) without touching autoApply, not just setting both at once.
    const resultingAutoApply = autoApply !== undefined ? !!autoApply : existing.autoApply;
    const resultingActive = active !== undefined ? !!active : existing.active;
    const resultingStartsAt = startsAt !== undefined ? (startsAt ?? undefined) : existing.startsAt;
    const resultingExpiresAt = expiresAt !== undefined ? (expiresAt ?? undefined) : existing.expiresAt;
    if (resultingStartsAt && resultingExpiresAt && new Date(resultingStartsAt).getTime() >= new Date(resultingExpiresAt).getTime()) {
      return ApiResponse.error('startsAt must be before expiresAt');
    }
    const conflict = await findConflictingAutoApplyCode(code, resultingAutoApply, resultingActive, resultingStartsAt, resultingExpiresAt);
    if (conflict) {
      return ApiResponse.error(`"${conflict}" is already the active auto-apply promo during that period — deactivate it or adjust the dates first.`, 409);
    }

    const updated = await PromoCodeRepository.update(code, {
      discountType, discountValue, durationPeriods, autoApply, applicablePlans, maxRedemptions, startsAt, expiresAt, active, notes,
    });
    if (!updated) return ApiResponse.notFound('Promo code not found');

    return ApiResponse.success({ code: updated });
  }

  static async deactivatePromoCode(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const code = getPromoCode(event);
    if (!code) return ApiResponse.notFound('Promo code not found');

    const updated = await PromoCodeRepository.update(code, { active: false });
    if (!updated) return ApiResponse.notFound('Promo code not found');

    return ApiResponse.success({ code: updated });
  }
}
