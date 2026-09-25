export type Plan = 'free' | 'starter' | 'growth' | 'business';
export type PaidPlan = 'starter' | 'growth' | 'business';
export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'past_due';
export type BillingCycle = 'monthly' | 'annual';
export type PaymentMethod = 'gcash' | 'maya' | 'bank_transfer';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank Transfer',
};
export type PaymentSubmissionStatus = 'pending' | 'verified' | 'rejected';

export interface AccountSubscription {
  accountId: string;
  plan: Plan;
  planUpdatedAt: string;
  subscriptionStatus: SubscriptionStatus;
  billingCycle?: BillingCycle;
  hasUsedTrial: boolean;
  trialStartedAt?: string;
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  pastDueSince?: string;
  promoCode?: string;
  promoPeriodsRemaining?: number;
}

export interface PlanLimits {
  maxProperties: number;
  maxPhotosPerListing: number;
  listingDurationDays: number | null;
  searchPlacement: 'standard' | 'priority' | 'featured';
  maxInvoicesPerMonth: number;
  maxSeats: number;
  maxDocumentBytes: number;
}

export interface UsageSummary {
  plan: Plan;
  limits: PlanLimits;
  usage: {
    properties: number;
    invoicesThisMonth: number;
    documentBytes: number;
    seats: number;
  };
}

export interface PromoCode {
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  durationPeriods: number;
  autoApply: boolean;
  applicablePlans?: PaidPlan[];
  maxRedemptions?: number;
  redemptionCount: number;
  startsAt?: string;
  expiresAt?: string;
  active: boolean;
  notes?: string;
}

export interface AmountDue {
  baseAmount: number;
  discountAmount: number;
  amountDue: number;
}

export interface PaymentSubmission {
  id: string;
  accountId: string;
  accountEmail?: string | null; // enriched by the platform-admin list endpoint only
  submittedBySub: string;
  requestedPlan: PaidPlan;
  requestedBillingCycle: BillingCycle;
  method: PaymentMethod;
  referenceNumber: string;
  amountClaimed: number;
  promoCode?: string;
  amountExpected: number;
  proofS3Key: string;
  proofFileName: string;
  status: PaymentSubmissionStatus;
  adminNotes?: string;
  verifiedBySub?: string;
  verifiedAt?: string;
  submittedAt: string;
  createdAt: string;
}

export interface CreatePaymentSubmissionPayload {
  requestedPlan: PaidPlan;
  requestedBillingCycle: BillingCycle;
  method: PaymentMethod;
  referenceNumber: string;
  amountClaimed: number;
  promoCode?: string;
  proofS3Key: string;
  proofFileName: string;
}

export const PLAN_PRICING: Record<PaidPlan, { monthly: number; annual: number }> = {
  starter: { monthly: 699, annual: 6990 },
  growth: { monthly: 1499, annual: 14990 },
  business: { monthly: 2990, annual: 29990 },
};
