import { PaidPlan, BillingCycle, PromoCode, PLAN_PRICING } from './types'

// Mirrors api/src/lib/pricing.ts's isPromoApplicable — kept in sync manually since this
// is a small, rarely-changing pure function duplicated client-side for the pricing
// table's display (the server is still the source of truth at actual submission time).
export function isPromoApplicableToPlan(promo: PromoCode, plan: PaidPlan): boolean {
  if (!promo.active) return false
  if (promo.startsAt && new Date(promo.startsAt).getTime() > Date.now()) return false
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() <= Date.now()) return false
  if (promo.maxRedemptions !== undefined && promo.redemptionCount >= promo.maxRedemptions) return false
  if (promo.applicablePlans && !promo.applicablePlans.includes(plan)) return false
  return true
}

export function calculateDisplayAmount(plan: PaidPlan, cycle: BillingCycle, promo: PromoCode | null): { base: number; discount: number; due: number } {
  const base = PLAN_PRICING[plan][cycle]
  if (!promo || !isPromoApplicableToPlan(promo, plan)) return { base, discount: 0, due: base }
  const discount = promo.discountType === 'percent' ? Math.round(base * (promo.discountValue / 100)) : Math.min(promo.discountValue, base)
  return { base, discount, due: base - discount }
}

// durationPeriods is billing-cycle-agnostic (see docs/Payments-and-Subscription-Plan.md),
// so "1 period" reads as "first month" on the monthly cycle but "first year" on annual —
// without this, a discounted price could look like the ongoing price rather than a
// limited-time one. Shared by the pricing table and the payment submission form so both
// describe the same promo the same way.
export function getPromoDurationLabel(durationPeriods: number, cycle: BillingCycle): string {
  const unit = cycle === 'annual' ? 'year' : 'month'
  return durationPeriods === 1 ? `First ${unit} only` : `First ${durationPeriods} ${unit}s`
}
