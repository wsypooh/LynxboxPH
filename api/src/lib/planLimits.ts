import { Plan } from '../models/account';

export type SearchPlacement = 'standard' | 'priority' | 'featured';

const MB = 1024 * 1024;
const GB = 1024 * MB;

export interface PlanLimits {
  maxProperties: number;
  maxPhotosPerListing: number;
  listingDurationDays: number | null; // null = never expires
  searchPlacement: SearchPlacement;
  maxInvoicesPerMonth: number;
  maxSeats: number;
  maxDocumentBytes: number; // cumulative size of all non-deleted Documents on the account
}

// A landlord's real documents (lease PDFs, IDs, permits) are naturally numerous but
// individually small — capping by file count punishes normal onboarding well before
// any real storage cost is reached. maxDocumentBytes below is the real, cost-proportional
// limit; this is just a flat anti-abuse backstop against someone uploading thousands of
// tiny files, independent of plan.
export const DOCUMENT_COUNT_ABUSE_GUARD = 500;

// docs/Pricing-Strategy-Plan.md — the only place these numbers are registered.
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxProperties: 2, maxPhotosPerListing: 3, listingDurationDays: 7, searchPlacement: 'standard',
    maxInvoicesPerMonth: 10, maxSeats: 1, maxDocumentBytes: 250 * MB,
  },
  starter: {
    maxProperties: 5, maxPhotosPerListing: 10, listingDurationDays: 30, searchPlacement: 'standard',
    maxInvoicesPerMonth: 50, maxSeats: 2, maxDocumentBytes: 1 * GB,
  },
  growth: {
    maxProperties: 15, maxPhotosPerListing: 10, listingDurationDays: 60, searchPlacement: 'priority',
    maxInvoicesPerMonth: 200, maxSeats: 5, maxDocumentBytes: 5 * GB,
  },
  business: {
    maxProperties: Infinity, maxPhotosPerListing: 10, listingDurationDays: null, searchPlacement: 'featured',
    maxInvoicesPerMonth: Infinity, maxSeats: Infinity, maxDocumentBytes: Infinity,
  },
};

export const SEARCH_PLACEMENT_RANK: Record<SearchPlacement, number> = {
  featured: 2,
  priority: 1,
  standard: 0,
};
