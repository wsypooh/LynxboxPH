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
  // A fixed penalty amount carried over from a historical-balance CSV import (docs/Ledger-Plan.md
  // "Added beyond the original plan" #9) — when set, LedgerRepository.pendingPenalty() returns
  // this (minus penaltyPaid) instead of computing simple interest from billingMonth, since the
  // old system's own record of accrued penalty is more accurate than reapplying this system's
  // rate retroactively over however long the charge was already overdue before migration. Frozen
  // by design: it never grows further, unlike a normal charge's formula-computed penalty.
  importedPenalty?: number;
  // Tenant.paymentWaived was on when this charge was created — principalOutstanding is 0
  // from the start (see createChargeEntry below), so this never accrues penalty or shows up
  // as owed in any rollover; kept here purely so the ledger view can label it "Waived"
  // instead of looking like a payment was collected with no record of one. See docs/Ledger-Plan.md.
  waived?: boolean;
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
  importedPenalty?: number;
  waived?: boolean;
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
    principalOutstanding: data.waived ? 0 : data.principalAmount,
    penaltyPaid: 0,
    importedPenalty: data.importedPenalty,
    waived: data.waived,
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
