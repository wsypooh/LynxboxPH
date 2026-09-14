import { v4 as uuidv4 } from 'uuid';
import { EntityType, BaseEntity } from '../lib/dynamodb';

export interface Building extends BaseEntity {
  [key: string]: any;
  id: string;
  ownerId: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  currentElectricityRate: number;
  vatRate: number;
  withholdingTaxRate: number;
  waterRate: number;
  defaultFixedWaterAmount: number;
  penaltyRate: number;
  earlyPaymentDiscountRate: number;
  earlyPaymentDays: number;
  deletedAt?: string;
}

export type BuildingInput = {
  ownerId: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  currentElectricityRate?: number;
  vatRate?: number;
  withholdingTaxRate?: number;
  waterRate?: number;
  defaultFixedWaterAmount?: number;
  penaltyRate?: number;
  earlyPaymentDiscountRate?: number;
  earlyPaymentDays?: number;
};

export function createBuilding(data: BuildingInput): Building {
  const now = new Date().toISOString();
  const id = uuidv4();
  return {
    PK: `BUILDING#${id}`,
    SK: `BUILDING#${id}`,
    GSI1PK: `USER#${data.ownerId}`,
    GSI1SK: `BUILDING#${id}`,
    entityType: EntityType.BUILDING,
    id,
    ownerId: data.ownerId,
    name: data.name,
    address: data.address,
    phone: data.phone,
    email: data.email,
    currentElectricityRate: data.currentElectricityRate ?? 0,
    vatRate: data.vatRate ?? 0.12,
    withholdingTaxRate: data.withholdingTaxRate ?? 0.05,
    waterRate: data.waterRate ?? 0,
    defaultFixedWaterAmount: data.defaultFixedWaterAmount ?? 0,
    penaltyRate: data.penaltyRate ?? 0.05,
    earlyPaymentDiscountRate: data.earlyPaymentDiscountRate ?? 0,
    earlyPaymentDays: data.earlyPaymentDays ?? 5,
    createdAt: now,
    updatedAt: now,
  };
}
