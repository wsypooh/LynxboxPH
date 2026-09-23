import { Plan } from '../models/account';

export type SearchPlacement = 'standard' | 'priority' | 'featured';

export interface PlanLimits {
  maxProperties: number;
  maxPhotosPerListing: number;
  listingDurationDays: number | null; // null = never expires
  searchPlacement: SearchPlacement;
  maxInvoicesPerMonth: number;
  maxSeats: number;
  maxDocuments: number;
}

// docs/Pricing-Strategy-Plan.md — the only place these numbers are registered.
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxProperties: 2, maxPhotosPerListing: 3, listingDurationDays: 7, searchPlacement: 'standard',
    maxInvoicesPerMonth: 10, maxSeats: 1, maxDocuments: 20,
  },
  starter: {
    maxProperties: 5, maxPhotosPerListing: Infinity, listingDurationDays: 30, searchPlacement: 'standard',
    maxInvoicesPerMonth: 50, maxSeats: 2, maxDocuments: 200,
  },
  growth: {
    maxProperties: 15, maxPhotosPerListing: Infinity, listingDurationDays: 60, searchPlacement: 'priority',
    maxInvoicesPerMonth: 200, maxSeats: 5, maxDocuments: 1000,
  },
  business: {
    maxProperties: Infinity, maxPhotosPerListing: Infinity, listingDurationDays: null, searchPlacement: 'featured',
    maxInvoicesPerMonth: Infinity, maxSeats: Infinity, maxDocuments: Infinity,
  },
};

export const SEARCH_PLACEMENT_RANK: Record<SearchPlacement, number> = {
  featured: 2,
  priority: 1,
  standard: 0,
};
