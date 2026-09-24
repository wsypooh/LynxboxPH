import { PaidPlan, BillingCycle } from '../models/account';
import { PromoCode } from '../models/promoCode';

// docs/Payments-and-Subscription-Plan.md — sibling to planLimits.ts, not overlapping:
// this file is peso amounts, planLimits.ts is usage ceilings. Same "only place these
// numbers are registered" convention.
export const PLAN_PRICING: Record<PaidPlan, { monthly: number; annual: number }> = {
  starter: { monthly: 699, annual: 6990 },
  growth: { monthly: 1499, annual: 14990 },
  business: { monthly: 2990, annual: 29990 },
};

export interface AmountDue {
  baseAmount: number;
  discountAmount: number;
  amountDue: number;
}

// Promo eligibility for a given plan+cycle purchase: active, already started, not
// expired, under its redemption cap, and (if restricted) applicable to this specific plan.
export function isPromoApplicable(promo: PromoCode, plan: PaidPlan): boolean {
  if (!promo.active) return false;
  if (promo.startsAt && new Date(promo.startsAt).getTime() > Date.now()) return false;
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() <= Date.now()) return false;
  if (promo.maxRedemptions !== undefined && promo.redemptionCount >= promo.maxRedemptions) return false;
  if (promo.applicablePlans && !promo.applicablePlans.includes(plan)) return false;
  return true;
}

// A code's own validity (isPromoApplicable) isn't the whole story once an account has
// already been using it across renewals — durationPeriods is a per-account allowance, not
// a global one. Resolves whether THIS account still has periods left on THIS code.
//
// Promo codes are new-customers-only: an account that has ever had an approved payment
// (lastVerifiedPaymentSubmissionId set) can't START a promo relationship it isn't already
// in. It CAN continue one already in progress — durationPeriods spanning multiple renewals
// means the account will have a payment on record (from that very promo's own first
// period) by the time it renews, and that must not retroactively disqualify it.
export function resolvePromoForAccount(
  account: { promoCode?: string; promoPeriodsRemaining?: number; lastVerifiedPaymentSubmissionId?: string },
  promo: PromoCode | null
): { promo: PromoCode | null; periodsRemainingBeforeUse: number } {
  if (!promo) return { promo: null, periodsRemainingBeforeUse: 0 };
  const alreadyUsingThisCode = account.promoCode === promo.code;

  if (!alreadyUsingThisCode && account.lastVerifiedPaymentSubmissionId) {
    return { promo: null, periodsRemainingBeforeUse: 0 };
  }

  const periodsRemainingBeforeUse = alreadyUsingThisCode ? (account.promoPeriodsRemaining ?? 0) : promo.durationPeriods;
  if (periodsRemainingBeforeUse <= 0) return { promo: null, periodsRemainingBeforeUse: 0 };
  return { promo, periodsRemainingBeforeUse };
}

export function calculateAmountDue(plan: PaidPlan, cycle: BillingCycle, promo?: PromoCode | null): AmountDue {
  const baseAmount = PLAN_PRICING[plan][cycle === 'annual' ? 'annual' : 'monthly'];

  if (!promo || !isPromoApplicable(promo, plan)) {
    return { baseAmount, discountAmount: 0, amountDue: baseAmount };
  }

  const discountAmount = promo.discountType === 'percent'
    ? Math.round(baseAmount * (promo.discountValue / 100))
    : Math.min(promo.discountValue, baseAmount);

  return { baseAmount, discountAmount, amountDue: baseAmount - discountAmount };
}
