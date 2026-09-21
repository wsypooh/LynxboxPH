import { v4 as uuidv4 } from 'uuid';
import { EntityType, BaseEntity } from '../lib/dynamodb';

export interface TenantContract {
  id?: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  deposit: number;
  notes?: string;
}

export interface Tenant extends BaseEntity {
  [key: string]: any;
  id: string;
  tenantCode: string;
  ownerId: string;
  buildingId: string;
  floor: string;
  roomNumber: string;
  area: number;
  lesseeName: string;
  contactEmail?: string;
  contactPhone?: string;
  tin?: string;
  defaultRent: number;
  vatEnabled: boolean;
  withholdingTaxEnabled: boolean;
  electricityMode: 'metered' | 'direct';
  waterMode: 'metered' | 'fixed' | 'direct';
  defaultWaterRate?: number;
  defaultFixedWater?: number;
  defaultGuard?: number;
  penaltyEnabled: boolean;
  status: 'active' | 'inactive';
  contracts: TenantContract[];
  deletedAt?: string;
}

export type TenantInput = {
  tenantCode?: string;
  ownerId: string;
  buildingId: string;
  floor: string;
  roomNumber: string;
  area: number;
  lesseeName: string;
  contactEmail?: string;
  contactPhone?: string;
  tin?: string;
  defaultRent: number;
  vatEnabled?: boolean;
  withholdingTaxEnabled?: boolean;
  electricityMode?: 'metered' | 'direct';
  waterMode?: 'metered' | 'fixed' | 'direct';
  defaultWaterRate?: number;
  defaultFixedWater?: number;
  defaultGuard?: number;
  penaltyEnabled?: boolean;
  status?: 'active' | 'inactive';
  contracts?: TenantContract[];
};

export function createTenant(data: TenantInput, tenantCode: string): Tenant {
  const now = new Date().toISOString();
  const id = uuidv4();
  return {
    PK: `TENANT#${id}`,
    SK: `TENANT#${id}`,
    GSI1PK: `USER#${data.ownerId}`,
    GSI1SK: `TENANT#${id}`,
    entityType: EntityType.TENANT,
    id,
    tenantCode,
    ownerId: data.ownerId,
    buildingId: data.buildingId,
    floor: data.floor,
    roomNumber: data.roomNumber,
    area: data.area,
    lesseeName: data.lesseeName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    tin: data.tin,
    defaultRent: data.defaultRent,
    vatEnabled: data.vatEnabled ?? false,
    withholdingTaxEnabled: data.withholdingTaxEnabled ?? false,
    electricityMode: data.electricityMode ?? 'metered',
    waterMode: data.waterMode ?? 'fixed',
    defaultWaterRate: data.defaultWaterRate,
    defaultFixedWater: data.defaultFixedWater,
    defaultGuard: data.defaultGuard,
    penaltyEnabled: data.penaltyEnabled ?? true,
    status: data.status ?? 'active',
    contracts: data.contracts ?? [],
    createdAt: now,
    updatedAt: now,
  };
}
