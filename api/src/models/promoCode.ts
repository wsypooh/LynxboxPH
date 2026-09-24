import { EntityType, BaseEntity } from '../lib/dynamodb';
import { PaidPlan } from './account';

export type PromoDiscountType = 'percent' | 'fixed';

// docs/Payments-and-Subscription-Plan.md — code is the natural key (normalized uppercase),
// direct-lookup by PK, no GSI1 needed. Admin's "list all codes" uses a small Scan, same
// low-cardinality tradeoff as PlatformAdminRepository's account listing.
export interface PromoCode extends BaseEntity {
  [key: string]: any;
  code: string;
  discountType: PromoDiscountType;
  discountValue: number; // percent (0-100) or a peso amount, per discountType
  durationPeriods: number; // number of billing periods the discount applies to (1 = first payment only)
  autoApply: boolean; // true = shown automatically on pricing/plan-picker; false = customer must enter it
  applicablePlans?: PaidPlan[]; // undefined = all paid plans
  maxRedemptions?: number; // undefined = unlimited
  redemptionCount: number;
  startsAt?: string; // undefined = active immediately once `active` is true
  expiresAt?: string;
  active: boolean;
  notes?: string;
}

export type PromoCodeInput = Omit<PromoCode, keyof BaseEntity | 'redemptionCount'> & { id?: string };

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function createPromoCode(data: PromoCodeInput): PromoCode {
  const now = new Date().toISOString();
  const code = normalizeCode(data.code);

  return {
    PK: `PROMO_CODE#${code}`,
    SK: `PROMO_CODE#${code}`,
    entityType: EntityType.PROMO_CODE,
    id: data.id || code,
    createdAt: now,
    updatedAt: now,
    code,
    discountType: data.discountType,
    discountValue: data.discountValue,
    durationPeriods: data.durationPeriods,
    autoApply: data.autoApply,
    applicablePlans: data.applicablePlans,
    maxRedemptions: data.maxRedemptions,
    redemptionCount: 0,
    startsAt: data.startsAt,
    expiresAt: data.expiresAt,
    active: data.active,
    notes: data.notes,
  };
}

export { normalizeCode };
