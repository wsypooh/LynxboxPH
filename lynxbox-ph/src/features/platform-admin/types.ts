import { Property } from '@/features/properties/types';
import { Building, Tenant, Invoice } from '@/features/invoicing/types';
import { Document } from '@/features/documents/types';

export interface AccountSummary {
  accountId: string;
  ownerEmail: string | null;
  memberCount: number;
  propertyCount: number;
  tenantCount: number;
  buildingCount: number;
  documentCount: number;
  invoicesByMonth: Record<string, number>;
}

export interface PlatformSummary {
  totalAccounts: number;
  totalUsers: number | null;
  accounts: AccountSummary[];
  generatedAt: string;
}

export type Plan = 'free' | 'starter' | 'growth' | 'business';

export interface AccountDetail {
  accountId: string;
  ownerEmail: string | null;
  plan: Plan;
  properties: Property[];
  buildings: Building[];
  tenants: Tenant[];
  documents: Document[];
  invoices: Invoice[];
}
