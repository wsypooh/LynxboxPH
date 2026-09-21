import { v4 as uuidv4 } from 'uuid';
import { EntityType, BaseEntity } from '../lib/dynamodb';
import { PaymentMethod } from './invoice';

export interface AppliedTo {
  chargeEntryId: string;
  penaltyApplied: number;
  principalApplied: number;
}

export interface ChargeEntry extends BaseEntity {
  [key: string]: any;
  id: string;
  entryType: 'charge';
  tenantId: string;
  ownerId: string;
  billingMonth: string;
  principalAmount: number;
  principalOutstanding: number;
  penaltyPaid: number;
  invoiceNumber?: string;
  invoiceId?: string;
  description: string;
  source: 'import' | 'invoice';
  deletedAt?: string;
}

export interface PaymentEntry extends BaseEntity {
  [key: string]: any;
  id: string;
  entryType: 'payment';
  tenantId: string;
  ownerId: string;
  paymentDate: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  note?: string;
  appliedTo: AppliedTo[];
  deletedAt?: string;
}

export type LedgerEntry = ChargeEntry | PaymentEntry;

export type ChargeEntryInput = {
  tenantId: string;
  ownerId: string;
  billingMonth: string;
  principalAmount: number;
  invoiceNumber?: string;
  invoiceId?: string;
  description: string;
  source: 'import' | 'invoice';
};

export type PaymentEntryInput = {
  tenantId: string;
  ownerId: string;
  paymentDate: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  note?: string;
  appliedTo: AppliedTo[];
};

export function createChargeEntry(data: ChargeEntryInput): ChargeEntry {
  const now = new Date().toISOString();
  const id = uuidv4();
  return {
    PK: `LEDGER_ENTRY#${id}`,
    SK: `LEDGER_ENTRY#${id}`,
    GSI1PK: `LEDGER#${data.tenantId}`,
    GSI1SK: `CHARGE#${data.billingMonth}#${id}`,
    entityType: EntityType.LEDGER_ENTRY,
    id,
    entryType: 'charge',
    tenantId: data.tenantId,
    ownerId: data.ownerId,
    billingMonth: data.billingMonth,
    principalAmount: data.principalAmount,
    principalOutstanding: data.principalAmount,
    penaltyPaid: 0,
    invoiceNumber: data.invoiceNumber,
    invoiceId: data.invoiceId,
    description: data.description,
    source: data.source,
    createdAt: now,
    updatedAt: now,
  };
}

export function createPaymentEntry(data: PaymentEntryInput): PaymentEntry {
  const now = new Date().toISOString();
  const id = uuidv4();
  return {
    PK: `LEDGER_ENTRY#${id}`,
    SK: `LEDGER_ENTRY#${id}`,
    GSI1PK: `LEDGER#${data.tenantId}`,
    GSI1SK: `PAYMENT#${data.paymentDate}#${id}`,
    entityType: EntityType.LEDGER_ENTRY,
    id,
    entryType: 'payment',
    tenantId: data.tenantId,
    ownerId: data.ownerId,
    paymentDate: data.paymentDate,
    totalAmount: data.totalAmount,
    paymentMethod: data.paymentMethod,
    note: data.note,
    appliedTo: data.appliedTo,
    createdAt: now,
    updatedAt: now,
  };
}
