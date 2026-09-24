import { ddbDocClient, EntityType } from '../lib/dynamodb';
import { AccountPlan, Plan, PaidPlan, BillingCycle, SubscriptionStatus, defaultAccountPlan } from '../models/account';
import { GetCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

function planKey(accountId: string) {
  return { PK: `ACCOUNT#${accountId}`, SK: `PLAN#${accountId}` };
}

function usageKey(accountId: string, yearMonth: string) {
  return { PK: `ACCOUNT#${accountId}`, SK: `USAGE#${accountId}#${yearMonth}` };
}

// Shared by every lifecycle method below: builds an UpdateExpression that SETs the given
// fields and REMOVEs any explicitly passed as `undefined` (DynamoDB has no "set to
// undefined" — clearing a field means REMOVE), always bumps updatedAt, and creates the
// row on first write via if_not_exists(createdAt, ...) — the PLAN# row is lazily created,
// same zero-migration pattern as everything else in this doc.
async function patchAccountPlan(accountId: string, fields: Record<string, any>): Promise<AccountPlan> {
  const now = new Date().toISOString();
  const setExpressions: string[] = ['#updatedAt = :updatedAt', '#entityType = :entityType', '#accountId = :accountId'];
  const removeExpressions: string[] = [];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt', '#entityType': 'entityType', '#accountId': 'accountId' };
  const values: Record<string, any> = { ':updatedAt': now, ':entityType': EntityType.ACCOUNT, ':accountId': accountId };

  Object.entries(fields).forEach(([key, value]) => {
    names[`#${key}`] = key;
    if (value === undefined) {
      removeExpressions.push(`#${key}`);
    } else {
      setExpressions.push(`#${key} = :${key}`);
      values[`:${key}`] = value;
    }
  });

  setExpressions.push('#createdAt = if_not_exists(#createdAt, :createdAtFallback)');
  names['#createdAt'] = 'createdAt';
  values[':createdAtFallback'] = now;

  const { Attributes } = await ddbDocClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: planKey(accountId),
    UpdateExpression: `SET ${setExpressions.join(', ')}${removeExpressions.length ? ` REMOVE ${removeExpressions.join(', ')}` : ''}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));
  return Attributes as AccountPlan;
}

export class AccountRepository {
  // Returns the whole row (not narrowed to { plan }) — the Payments and Subscription plan
  // adds subscriptionStatus/trial/billing-period fields to this same PLAN# row and reads
  // them off this same Get at zero extra cost.
  static async getPlan(accountId: string): Promise<AccountPlan> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: planKey(accountId),
    }));
    if (!Item) return defaultAccountPlan(accountId);
    return Item as AccountPlan;
  }

  // Merges rather than overwrites (an earlier version used PutCommand, which would have
  // silently wiped subscriptionStatus/trial/billing-period fields on every manual plan
  // change once those existed) — this is the platform-admin manual plan-toggle endpoint's
  // only write path, and it must coexist with the subscription lifecycle fields below.
  static async setPlan(accountId: string, plan: Plan): Promise<AccountPlan> {
    return patchAccountPlan(accountId, { plan, planUpdatedAt: new Date().toISOString() });
  }

  static async getMonthlyInvoiceCount(accountId: string, yearMonth: string): Promise<number> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: usageKey(accountId, yearMonth),
    }));
    return (Item?.invoiceCount as number | undefined) ?? 0;
  }

  static async incrementMonthlyInvoiceCount(accountId: string, yearMonth: string): Promise<number> {
    const now = new Date().toISOString();
    const { Attributes } = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: usageKey(accountId, yearMonth),
      UpdateExpression: 'ADD invoiceCount :one SET entityType = :entityType, accountId = :accountId, yearMonth = :yearMonth, updatedAt = :now, createdAt = if_not_exists(createdAt, :now)',
      ExpressionAttributeValues: {
        ':one': 1,
        ':entityType': EntityType.ACCOUNT,
        ':accountId': accountId,
        ':yearMonth': yearMonth,
        ':now': now,
      },
      ReturnValues: 'ALL_NEW',
    }));
    return (Attributes?.invoiceCount as number) ?? 0;
  }

  // docs/Payments-and-Subscription-Plan.md — subscription lifecycle. The one-trial-ever
  // guard (hasUsedTrial) and the "only while trialing" guard for extendTrial are business
  // rules enforced by the calling handler, not here, matching this repo's convention that
  // repositories don't validate — see PlatformAdminDashboardHandler.updateAccountPlan for
  // the same division of responsibility on the existing setPlan() caller.
  static async startTrial(accountId: string, plan: PaidPlan, billingCycle: BillingCycle): Promise<AccountPlan> {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return patchAccountPlan(accountId, {
      plan,
      planUpdatedAt: now.toISOString(),
      subscriptionStatus: 'trialing' as SubscriptionStatus,
      billingCycle,
      hasUsedTrial: true,
      trialStartedAt: now.toISOString(),
      trialEndsAt,
      trialEndingSoonNotifiedAt: undefined,
      currentPeriodEnd: trialEndsAt,
      pendingPlan: undefined,
      pendingBillingCycle: undefined,
    });
  }

  static async applyVerifiedPayment(accountId: string, params: {
    plan: PaidPlan;
    billingCycle: BillingCycle;
    periodDays: number;
    // ISO date to extend the new period from instead of from now — set by the caller only
    // for a genuine early same-plan/same-cycle renewal, so paying ahead of the due date
    // stacks the new days on top rather than discarding whatever was left unused.
    stackFrom?: string;
    verifiedSubmissionId: string;
    promoCode?: string;
    promoPeriodsRemaining?: number;
  }): Promise<AccountPlan> {
    const now = new Date();
    const periodEndAnchor = params.stackFrom ? new Date(params.stackFrom) : now;
    return patchAccountPlan(accountId, {
      plan: params.plan,
      planUpdatedAt: now.toISOString(),
      subscriptionStatus: 'active' as SubscriptionStatus,
      billingCycle: params.billingCycle,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: new Date(periodEndAnchor.getTime() + params.periodDays * 24 * 60 * 60 * 1000).toISOString(),
      trialEndsAt: undefined,
      renewalReminderSentAt: undefined,
      pastDueSince: undefined,
      listingsHiddenReason: null,
      pendingPlan: undefined,
      pendingBillingCycle: undefined,
      lastVerifiedPaymentSubmissionId: params.verifiedSubmissionId,
      promoCode: params.promoCode,
      promoPeriodsRemaining: params.promoPeriodsRemaining,
    });
  }

  // Idempotency guard for the cron's renewal-due-soon reminder — mirrors
  // markTrialEndingSoonNotified, but for an active paid period instead of a trial.
  static async markRenewalReminderSent(accountId: string): Promise<AccountPlan> {
    return patchAccountPlan(accountId, { renewalReminderSentAt: new Date().toISOString() });
  }

  static async markPastDue(accountId: string): Promise<AccountPlan> {
    return patchAccountPlan(accountId, {
      subscriptionStatus: 'past_due' as SubscriptionStatus,
      pastDueSince: new Date().toISOString(),
      listingsHiddenReason: 'past_due',
    });
  }

  static async revertToFree(accountId: string): Promise<AccountPlan> {
    return patchAccountPlan(accountId, {
      plan: 'free' as Plan,
      planUpdatedAt: new Date().toISOString(),
      subscriptionStatus: 'free' as SubscriptionStatus,
      billingCycle: undefined,
      trialEndsAt: undefined,
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
      pastDueSince: undefined,
      listingsHiddenReason: null,
      pendingPlan: undefined,
      pendingBillingCycle: undefined,
      promoCode: undefined,
      promoPeriodsRemaining: undefined,
    });
  }

  // Idempotency guard for the cron's trial-ending-soon reminder — set once so the email
  // fires exactly once per trial, not once per day for the remaining reminder window.
  static async markTrialEndingSoonNotified(accountId: string): Promise<AccountPlan> {
    return patchAccountPlan(accountId, { trialEndingSoonNotifiedAt: new Date().toISOString() });
  }

  // `plan` is required (and re-establishes subscriptionStatus='trialing') when the
  // account isn't currently trialing — a lapsed trial reverts to Free with no memory of
  // what it was trialing before, so re-granting one needs to be told which plan again.
  // Deliberately bypasses hasUsedTrial (never reset, by design) since this is an admin
  // override, not the customer's own self-serve one-trial-ever start-trial path.
  static async extendTrial(accountId: string, newTrialEndsAt: string, notes?: string, plan?: PaidPlan): Promise<AccountPlan> {
    const now = new Date().toISOString();
    return patchAccountPlan(accountId, {
      ...(plan ? {
        plan,
        planUpdatedAt: now,
        subscriptionStatus: 'trialing' as SubscriptionStatus,
        billingCycle: 'monthly' as BillingCycle,
        trialStartedAt: now,
        hasUsedTrial: true,
        pastDueSince: undefined,
        listingsHiddenReason: null,
      } : {}),
      trialEndsAt: newTrialEndsAt,
      currentPeriodEnd: newTrialEndsAt,
      trialExtendedByAdminAt: now,
      trialExtensionNotes: notes,
      // Clear so the reminder can fire again ahead of the new, later end date.
      trialEndingSoonNotifiedAt: undefined,
    });
  }

  // Cron-only: no GSI covers "every account past its date," so this Scans the whole table
  // filtered to just PLAN# rows — same accepted tradeoff as PlatformAdminRepository's
  // account-summary Scan at this project's current scale (IAM already grants
  // dynamodb:Scan on Resource: "*"). Paginates to exhaustion via LastEvaluatedKey.
  static async listAllSubscriptions(): Promise<AccountPlan[]> {
    const items: AccountPlan[] = [];
    let ExclusiveStartKey: Record<string, any> | undefined;

    do {
      const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :entityType AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':entityType': EntityType.ACCOUNT, ':prefix': 'PLAN#' },
        ExclusiveStartKey,
      }));
      items.push(...(Items as AccountPlan[]));
      ExclusiveStartKey = LastEvaluatedKey;
    } while (ExclusiveStartKey);

    return items;
  }
}
