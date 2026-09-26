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
  // Gates the "Import CSV" button (docs/Property-Listing-Plan.md's bulk import) on the
  // frontend only — there's no dedicated bulk-import endpoint to enforce this against, since
  // the importer just calls the same createProperty/updateProperty every manual add already
  // uses. A real resource limit (maxProperties, maxPhotosPerListing, ...) still applies
  // regardless of how a listing was created either way.
  csvImportEnabled: boolean;
  // Tenant/Ledger/Invoice CSV bulk import — a different feature and a different plan
  // threshold (all-except-free) than Property's csvImportEnabled above (growth/business
  // only), so kept as its own flag rather than reused. Same "frontend-only gate" reasoning:
  // these importers call the same createTenant/createInvoice/recordPayment endpoints a
  // manual entry already uses.
  dataImportEnabled: boolean;
  // "Export CSV" buttons (TenantList.tsx, InvoiceList.tsx) — client-side only (builds a CSV
  // Blob from data already fetched for the page), so this is enforced entirely in the
  // frontend gate too; there's no export endpoint to check a plan against.
  dataExportEnabled: boolean;
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
    maxInvoicesPerMonth: 10, maxSeats: 1, maxDocumentBytes: 250 * MB, csvImportEnabled: false,
    dataImportEnabled: false, dataExportEnabled: false,
  },
  starter: {
    maxProperties: 5, maxPhotosPerListing: 10, listingDurationDays: 30, searchPlacement: 'standard',
    maxInvoicesPerMonth: 50, maxSeats: 3, maxDocumentBytes: 1 * GB, csvImportEnabled: false,
    dataImportEnabled: true, dataExportEnabled: true,
  },
  growth: {
    maxProperties: 15, maxPhotosPerListing: 10, listingDurationDays: 60, searchPlacement: 'priority',
    maxInvoicesPerMonth: 200, maxSeats: 10, maxDocumentBytes: 5 * GB, csvImportEnabled: true,
    dataImportEnabled: true, dataExportEnabled: true,
  },
  business: {
    maxProperties: Infinity, maxPhotosPerListing: 10, listingDurationDays: null, searchPlacement: 'featured',
    maxInvoicesPerMonth: Infinity, maxSeats: Infinity, maxDocumentBytes: Infinity, csvImportEnabled: true,
    dataImportEnabled: true, dataExportEnabled: true,
  },
};

export const SEARCH_PLACEMENT_RANK: Record<SearchPlacement, number> = {
  featured: 2,
  priority: 1,
  standard: 0,
};
