import { EntityType, BaseEntity } from '../lib/dynamodb';

export type Plan = 'free' | 'starter' | 'growth' | 'business';
export type PaidPlan = 'starter' | 'growth' | 'business';

// docs/Payments-and-Subscription-Plan.md
export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'past_due';
export type BillingCycle = 'monthly' | 'annual';

export interface AccountPlan extends BaseEntity {
  [key: string]: any;
  accountId: string;
  plan: Plan;
  planUpdatedAt: string;

  // docs/Payments-and-Subscription-Plan.md — added to this same PLAN# row rather than a
  // separate entity, since an account has exactly one current subscription state.
  subscriptionStatus: SubscriptionStatus;
  billingCycle?: BillingCycle;
  hasUsedTrial: boolean;              // one trial ever, anti-abuse — never reset
  trialStartedAt?: string;
  trialEndsAt?: string;
  trialEndingSoonNotifiedAt?: string; // idempotency guard for the reminder email
  trialExtendedByAdminAt?: string;
  trialExtensionNotes?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;          // cron's "is payment due" check
  renewalReminderSentAt?: string;     // idempotency guard for the renewal-due-soon email, cleared on every new period
  pastDueSince?: string;              // cron's "14 days past due" check
  listingsHiddenReason?: 'past_due' | null; // temporary, reversible listing hide
  pendingPlan?: PaidPlan;             // denormalized convenience from a pending submission
  pendingBillingCycle?: BillingCycle;
  lastVerifiedPaymentSubmissionId?: string;
  promoCode?: string;                 // currently-applied promo
  promoPeriodsRemaining?: number;     // decremented on each approved renewal using it
}

// Default plan for an account that has no PLAN# row yet — mirrors the zero-migration,
// lazy-default pattern RBAC already uses for solo accounts with no MEMBER# rows.
export function defaultAccountPlan(accountId: string): AccountPlan {
  return {
    PK: `ACCOUNT#${accountId}`,
    SK: `PLAN#${accountId}`,
    entityType: EntityType.ACCOUNT,
    id: accountId,
    accountId,
    plan: 'free',
    planUpdatedAt: '',
    subscriptionStatus: 'free',
    hasUsedTrial: false,
    createdAt: '',
    updatedAt: '',
  };
}
