import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../../lib/apiResponse';
import { resolveActor, canManageBilling, Actor } from '../../lib/auth';
import { AccountRepository } from '../../repositories/accountRepository';
import { PaymentSubmissionRepository } from '../../repositories/paymentSubmissionRepository';
import { PromoCodeRepository } from '../../repositories/promoCodeRepository';
import { PropertyRepository, isPropertyExpired } from '../../repositories/propertyRepository';
import { DocumentRepository } from '../../repositories/documentRepository';
import { MembershipRepository } from '../../repositories/membershipRepository';
import { PLAN_LIMITS } from '../../lib/planLimits';
import { calculateAmountDue, resolvePromoForAccount } from '../../lib/pricing';
import { PaidPlan, BillingCycle } from '../../models/account';
import { PaymentMethod } from '../../models/paymentSubmission';
import { S3Service } from '../../lib/s3';
import { ZeptoMailService } from '../../lib/zeptomail';
import { revertAccountToFree } from '../../lib/subscriptionLifecycle';

const mailer = new ZeptoMailService();
const PAID_PLANS: PaidPlan[] = ['starter', 'growth', 'business'];
const PAYMENT_METHODS: PaymentMethod[] = ['gcash', 'maya', 'bank_transfer'];

function getYearMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export class BillingHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const actor = await resolveActor(event);
    if (!actor) return ApiResponse.unauthorized('Authentication required');

    const method = event.httpMethod;
    const path = event.path;

    try {
      // Most-specific paths first. Note: none of these route through canWrite/canDestroy —
      // canManageBilling is the deliberate exception, since paying is how a past_due
      // account cures itself and must never be blocked by the past_due write-lock.
      if (method === 'POST' && path.endsWith('/api/billing/payment-submissions/upload-url')) {
        if (!canManageBilling(actor)) return ApiResponse.forbidden('You do not have permission to submit payments');
        return await BillingHandler.getUploadUrl(event, actor.accountId);
      } else if (method === 'POST' && path.endsWith('/api/billing/payment-submissions')) {
        if (!canManageBilling(actor)) return ApiResponse.forbidden('You do not have permission to submit payments');
        return await BillingHandler.createPaymentSubmission(event, actor);
      } else if (method === 'GET' && path.endsWith('/api/billing/payment-submissions')) {
        return await BillingHandler.listPaymentSubmissions(actor.accountId);
      } else if (method === 'POST' && path.endsWith('/api/billing/start-trial')) {
        if (!canManageBilling(actor)) return ApiResponse.forbidden('You do not have permission to manage billing');
        return await BillingHandler.startTrial(event, actor);
      } else if (method === 'POST' && path.endsWith('/api/billing/downgrade-to-free')) {
        if (!canManageBilling(actor)) return ApiResponse.forbidden('You do not have permission to manage billing');
        return await BillingHandler.downgradeToFree(actor);
      } else if (method === 'GET' && path.endsWith('/api/billing/promo-codes/validate')) {
        return await BillingHandler.validatePromoCode(event, actor);
      } else if (method === 'GET' && path.endsWith('/api/billing/usage')) {
        return await BillingHandler.getUsage(actor);
      } else if (method === 'GET' && path.endsWith('/api/billing/status')) {
        return await BillingHandler.getStatus(actor);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('BillingHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async getStatus(actor: Actor): Promise<APIGatewayProxyResult> {
    const account = await AccountRepository.getPlan(actor.accountId);
    return ApiResponse.success({ account });
  }

  static async getUsage(actor: Actor): Promise<APIGatewayProxyResult> {
    const limits = PLAN_LIMITS[actor.plan];
    const yearMonth = getYearMonth();

    const [propertiesResult, invoicesThisMonth, documents, members] = await Promise.all([
      PropertyRepository.listByOwner(actor.accountId, 1000),
      AccountRepository.getMonthlyInvoiceCount(actor.accountId, yearMonth),
      DocumentRepository.listByOwner(actor.accountId),
      MembershipRepository.listByAccount(actor.accountId).catch(() => []),
    ]);

    // Same "counts against the cap" definition as PropertyHandler.createProperty: available
    // and not expired — keeps this usage display consistent with what actually blocks a new listing.
    const activeListings = propertiesResult.items.filter(p => !p.deletedAt && p.status === 'available' && !isPropertyExpired(p.expiresAt)).length;
    // Solo accounts that never invited anyone have zero MEMBER# rows — still one seat (the owner).
    const seats = members.length > 0 ? members.length : 1;
    const documentBytes = documents.reduce((sum, d) => sum + d.fileSize, 0);

    return ApiResponse.success({
      plan: actor.plan,
      limits,
      usage: {
        properties: activeListings,
        invoicesThisMonth,
        documentBytes,
        seats,
      },
    });
  }

  static async startTrial(event: APIGatewayProxyEvent, actor: Actor): Promise<APIGatewayProxyResult> {
    const body = JSON.parse(event.body || '{}');
    const plan = body.plan as PaidPlan | undefined;
    const billingCycle: BillingCycle = body.billingCycle === 'annual' ? 'annual' : 'monthly';

    if (!plan || !PAID_PLANS.includes(plan)) {
      return ApiResponse.error(`plan must be one of: ${PAID_PLANS.join(', ')}`);
    }

    const account = await AccountRepository.getPlan(actor.accountId);
    if (account.hasUsedTrial) {
      return ApiResponse.forbidden('Your trial has already been used. Submit a payment to switch plans.');
    }

    const updated = await AccountRepository.startTrial(actor.accountId, plan, billingCycle);
    return ApiResponse.success({ account: updated });
  }

  // Self-serve downgrade — previously the only paths to Free were letting a paid period
  // lapse (which goes through the punitive past_due state first) or a platform-admin
  // manual override. This is immediate and voluntary: no past_due detour, same
  // reconciliation (existing excess listings unlisted, documents untouched) as any other
  // downgrade, via the same revertAccountToFree the cron uses — just a different reason
  // for the email copy.
  static async downgradeToFree(actor: Actor): Promise<APIGatewayProxyResult> {
    const account = await AccountRepository.getPlan(actor.accountId);
    if (account.plan === 'free') {
      return ApiResponse.error('This account is already on the Free plan', 400);
    }

    await revertAccountToFree(actor.accountId, 'voluntary');
    const updated = await AccountRepository.getPlan(actor.accountId);
    return ApiResponse.success({ account: updated });
  }

  static async getUploadUrl(event: APIGatewayProxyEvent, accountId: string): Promise<APIGatewayProxyResult> {
    const body = JSON.parse(event.body || '{}');
    const { fileName, contentType } = body as { fileName: string; contentType: string };
    if (!fileName || !contentType) return ApiResponse.error('fileName and contentType are required');

    const s3Service = new S3Service();
    try {
      s3Service.validateDocumentFile(fileName, contentType, 0); // size unknown until confirm step
    } catch (err: any) {
      return ApiResponse.error(err.message);
    }

    // Own S3 prefix, entirely separate from the Documents feature — this is never a
    // Document entity and never counts against a plan's maxDocumentBytes limit.
    const folderPrefix = `accounts/${accountId}/payment-proofs`;
    const { url, key } = await s3Service.getPresignedUploadUrl(fileName, contentType, undefined, folderPrefix);

    return ApiResponse.success({ uploadUrl: url, key });
  }

  static async createPaymentSubmission(event: APIGatewayProxyEvent, actor: Actor): Promise<APIGatewayProxyResult> {
    const body = JSON.parse(event.body || '{}');
    const {
      requestedPlan, requestedBillingCycle, method, referenceNumber, amountClaimed,
      promoCode, proofS3Key, proofFileName,
    } = body as {
      requestedPlan: PaidPlan;
      requestedBillingCycle: BillingCycle;
      method: PaymentMethod;
      referenceNumber: string;
      amountClaimed: number;
      promoCode?: string;
      proofS3Key: string;
      proofFileName: string;
    };

    if (!requestedPlan || !requestedBillingCycle || !method || !referenceNumber || !amountClaimed || !proofS3Key || !proofFileName) {
      return ApiResponse.error('Missing required fields');
    }
    if (!PAID_PLANS.includes(requestedPlan)) {
      return ApiResponse.error(`requestedPlan must be one of: ${PAID_PLANS.join(', ')}`);
    }
    if (!PAYMENT_METHODS.includes(method)) {
      return ApiResponse.error(`method must be one of: ${PAYMENT_METHODS.join(', ')}`);
    }

    const account = await AccountRepository.getPlan(actor.accountId);
    const rawPromo = promoCode ? await PromoCodeRepository.findByCode(promoCode) : null;
    const { promo } = resolvePromoForAccount(account, rawPromo);
    const { amountDue } = calculateAmountDue(requestedPlan, requestedBillingCycle, promo);

    const submission = await PaymentSubmissionRepository.create({
      accountId: actor.accountId,
      submittedBySub: actor.sub,
      requestedPlan,
      requestedBillingCycle,
      method,
      referenceNumber,
      amountClaimed,
      promoCode: promo ? promo.code : undefined,
      amountExpected: amountDue,
      proofS3Key,
      proofFileName,
    });

    try {
      await mailer.sendNewPaymentSubmissionAdminNotification({
        accountId: actor.accountId,
        accountEmail: actor.email || null,
        plan: requestedPlan,
        billingCycle: requestedBillingCycle,
        amountClaimed,
        method,
      });
    } catch (err) {
      console.error('Failed to send new-payment-submission admin notification:', err);
    }

    return ApiResponse.success({ submission });
  }

  // Preview for the "Apply" button on the payment form — authenticated (not
  // /api/public/*) specifically so it can enforce the same new-customers-only rule
  // (resolvePromoForAccount) that createPaymentSubmission applies for real, rather than
  // showing a discount that would silently not apply once actually submitted.
  static async validatePromoCode(event: APIGatewayProxyEvent, actor: Actor): Promise<APIGatewayProxyResult> {
    const code = event.queryStringParameters?.code;
    const plan = event.queryStringParameters?.plan as PaidPlan | undefined;
    const cycle: BillingCycle = event.queryStringParameters?.cycle === 'annual' ? 'annual' : 'monthly';

    if (!code || !plan || !PAID_PLANS.includes(plan)) {
      return ApiResponse.error('code and a valid plan query param are required');
    }

    const account = await AccountRepository.getPlan(actor.accountId);
    const rawPromo = await PromoCodeRepository.findByCode(code);
    const { promo } = resolvePromoForAccount(account, rawPromo);

    if (!promo) {
      const reason = rawPromo && account.lastVerifiedPaymentSubmissionId && account.promoCode !== rawPromo.code
        ? 'This promo code is only available to new customers'
        : 'This promo code is not valid for this plan';
      return ApiResponse.error(reason, 404);
    }

    const amount = calculateAmountDue(plan, cycle, promo);
    return ApiResponse.success({ promo, ...amount });
  }

  static async listPaymentSubmissions(accountId: string): Promise<APIGatewayProxyResult> {
    const submissions = await PaymentSubmissionRepository.listByAccount(accountId);
    return ApiResponse.success({ submissions });
  }
}
