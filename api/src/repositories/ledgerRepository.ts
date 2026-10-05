import { ddbDocClient } from '../lib/dynamodb';
import {
  ChargeEntry, PaymentEntry, LedgerEntry, ChargeEntryInput, PaymentEntryInput, AppliedTo,
  createChargeEntry, createPaymentEntry,
} from '../models/ledgerEntry';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { round2 } from '../lib/money';
import { InvoiceRepository } from './invoiceRepository';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';
// Fallback only — every real call site should pass the tenant's own Building.penaltyRate
// (BuildingForm.tsx's "Penalty Rate (%)" field). This used to be hardcoded here unconditionally,
// silently ignoring whatever rate an owner configured on their Building — see docs/Ledger-Plan.md.
export const DEFAULT_PENALTY_RATE = 0.05;

export interface PreviousBalanceEntry {
  invoiceNumber: string;
  billingMonth: string;
  billingLabel: string;
  amountDue: number;
  amountPaid: number;
  outstanding: number;
  penalty: number;
}

function formatBillingLabel(billingMonth: string): string {
  const [year, month] = billingMonth.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleString('en-PH', { month: 'long', year: 'numeric' });
}

function monthsOverdue(billingMonth: string, currentBillingMonth: string): number {
  const [chargeYear, chargeMonth] = billingMonth.split('-').map(Number);
  const [currentYear, currentMonth] = currentBillingMonth.split('-').map(Number);
  return Math.max(0, (currentYear - chargeYear) * 12 + (currentMonth - chargeMonth));
}

export function pendingPenalty(
  entry: ChargeEntry,
  currentBillingMonth: string,
  penaltyRate: number = DEFAULT_PENALTY_RATE,
): number {
  // An owner's explicit override (set via a draft invoice's Previous Balance Detail table,
  // docs/Ledger-Plan.md #5/#27) is the only thing that actually caps this -- an owner adjusting
  // or waiving a specific charge's penalty means exactly that, until they change it again.
  if (entry.penaltyOverride != null) {
    return Math.max(0, Math.round((entry.penaltyOverride - entry.penaltyPaid) * 100) / 100);
  }

  // `importedPenalty` (a CSV import's historical baseline) used to cap this the same way and
  // never grow further -- real bug, fixed 2026-10-06: an imported charge's penalty could never
  // grow past whatever was true the moment it was imported, even months later with real principal
  // still unpaid. It's purely informational now; a charge still accrues normally from its own
  // billingMonth whether or not it was CSV-imported.
  const overdue = monthsOverdue(entry.billingMonth, currentBillingMonth);
  const raw = Math.max(0, entry.principalOutstanding * penaltyRate * overdue - entry.penaltyPaid);
  return Math.round(raw * 100) / 100;
}

// Penalty must only ever reflect what's already been generated into a real invoice, never a
// live "as of today"/"as of the payment date" projection -- otherwise the same charge can show a
// different penalty depending on which screen computed it (docs/Ledger-Plan.md #26, #28). The
// tenant's own most recent non-deleted invoice's billingMonth is the latest point anything has
// actually been generated to; a charge newer than that (or a tenant with no invoice at all yet)
// correctly gets zero computed penalty until the next invoice formalizes it. Shared by
// LedgerHandler.getLedger (the Ledger view's headline/Charges table) and
// recordPaymentWithFIFO (what a payment actually collects), so both always agree.
export async function getPenaltyReferenceMonth(tenantId: string, charges?: ChargeEntry[]): Promise<string> {
  const invoices = (await InvoiceRepository.listByTenant(tenantId)).filter(i => !i.deletedAt);
  const latestInvoiceMonth = invoices.reduce((max, inv) => (inv.billingMonth > max ? inv.billingMonth : max), '');
  if (latestInvoiceMonth) return latestInvoiceMonth;
  const allCharges = charges ?? await LedgerRepository.listChargesByTenant(tenantId);
  return allCharges[allCharges.length - 1]?.billingMonth || new Date().toISOString().slice(0, 7);
}

export class LedgerRepository {
  static async createChargeEntry(data: ChargeEntryInput): Promise<ChargeEntry> {
    const entry = createChargeEntry(data);
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...entry },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    return entry;
  }

  static async createPaymentEntry(data: PaymentEntryInput): Promise<PaymentEntry> {
    const entry = createPaymentEntry(data);
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...entry },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    return entry;
  }

  static async findChargeById(id: string): Promise<ChargeEntry | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `LEDGER_ENTRY#${id}`, SK: `LEDGER_ENTRY#${id}` },
    }));
    return Item ? (Item as ChargeEntry) : null;
  }

  static async updateChargeEntry(id: string, updates: Partial<ChargeEntry>): Promise<ChargeEntry | null> {
    const now = new Date().toISOString();
    const expressions: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && !['PK', 'SK', 'GSI1PK', 'GSI1SK', 'entityType', 'createdAt', 'id', 'ownerId'].includes(key)) {
        expressions.push(`#${key} = :${key}`);
        names[`#${key}`] = key;
        values[`:${key}`] = value;
      }
    });

    if (expressions.length === 0) return this.findChargeById(id);

    expressions.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = now;

    const { Attributes } = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `LEDGER_ENTRY#${id}`, SK: `LEDGER_ENTRY#${id}` },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    return Attributes as ChargeEntry || null;
  }

  static async deleteChargeEntry(id: string): Promise<boolean> {
    const updated = await this.updateChargeEntry(id, { deletedAt: new Date().toISOString() });
    return !!updated;
  }

  static async deleteChargeEntryByInvoiceId(tenantId: string, invoiceId: string): Promise<boolean> {
    const match = await this.findChargeByInvoiceId(tenantId, invoiceId);
    if (!match) return false;
    return this.deleteChargeEntry(match.id);
  }

  static async findChargeByInvoiceId(tenantId: string, invoiceId: string): Promise<ChargeEntry | null> {
    const charges = await this.listChargesByTenant(tenantId);
    return charges.find(c => c.invoiceId === invoiceId) ?? null;
  }

  static async findPaymentById(id: string): Promise<PaymentEntry | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `LEDGER_ENTRY#${id}`, SK: `LEDGER_ENTRY#${id}` },
    }));
    return Item ? (Item as PaymentEntry) : null;
  }

  static async updatePaymentEntry(id: string, updates: Partial<PaymentEntry>): Promise<PaymentEntry | null> {
    const now = new Date().toISOString();
    const expressions: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && !['PK', 'SK', 'GSI1PK', 'GSI1SK', 'entityType', 'createdAt', 'id', 'ownerId'].includes(key)) {
        expressions.push(`#${key} = :${key}`);
        names[`#${key}`] = key;
        values[`:${key}`] = value;
      }
    });

    if (expressions.length === 0) return null;

    expressions.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = now;

    const { Attributes } = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `LEDGER_ENTRY#${id}`, SK: `LEDGER_ENTRY#${id}` },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    return Attributes as PaymentEntry || null;
  }

  static async deletePaymentEntry(id: string): Promise<boolean> {
    const updated = await this.updatePaymentEntry(id, { deletedAt: new Date().toISOString() });
    return !!updated;
  }

  // Unlike deletePaymentEntry (a bare soft-delete, only safe for resetTenantLedger's full wipe
  // where the charges are being deleted too), this reverses the payment's own FIFO allocation
  // before removing it -- restoring principalOutstanding/penaltyPaid on every charge in its
  // appliedTo -- so a wrong-amount payment can actually be corrected instead of leaving the
  // charges paid down by money that no longer has a record. Order-independent: each payment's
  // appliedTo was computed from whatever was outstanding at the moment IT was recorded, so
  // reversing it doesn't depend on whether other payments happened before or after.
  static async voidPaymentEntry(id: string): Promise<PaymentEntry | null> {
    const payment = await this.findPaymentById(id);
    if (!payment || payment.deletedAt) return null;

    await Promise.all(payment.appliedTo.map(async a => {
      const charge = await this.findChargeById(a.chargeEntryId);
      if (!charge) return;
      await this.updateChargeEntry(charge.id, {
        principalOutstanding: Math.min(charge.principalAmount, round2(charge.principalOutstanding + a.principalApplied)),
        penaltyPaid: Math.max(0, round2(charge.penaltyPaid - a.penaltyApplied)),
      });
    }));

    return this.updatePaymentEntry(id, { deletedAt: new Date().toISOString() });
  }

  static async listPaymentsForInvoice(tenantId: string, invoiceId: string): Promise<Array<{
    paymentEntryId: string;
    paymentDate: string;
    paymentMethod: PaymentEntry['paymentMethod'];
    note?: string;
    principalApplied: number;
    penaltyApplied: number;
  }>> {
    const [charges, payments] = await Promise.all([
      this.listChargesByTenant(tenantId),
      this.listPaymentsByTenant(tenantId),
    ]);
    const charge = charges.find(c => c.invoiceId === invoiceId);
    if (!charge) return [];

    const result: Array<{
      paymentEntryId: string; paymentDate: string; paymentMethod: PaymentEntry['paymentMethod'];
      note?: string; principalApplied: number; penaltyApplied: number;
    }> = [];
    for (const p of payments) {
      const applied = p.appliedTo.find(a => a.chargeEntryId === charge.id);
      if (applied) {
        result.push({
          paymentEntryId: p.id,
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          note: p.note,
          principalApplied: applied.principalApplied,
          penaltyApplied: applied.penaltyApplied,
        });
      }
    }
    return result;
  }

  static async listPaymentsSince(tenantId: string, sinceIso?: string): Promise<PaymentEntry[]> {
    const payments = await this.listPaymentsByTenant(tenantId);
    if (!sinceIso) return payments;
    return payments.filter(p => p.createdAt > sinceIso);
  }

  static async resetTenantLedger(tenantId: string): Promise<{ chargesCleared: number; paymentsCleared: number }> {
    const [charges, payments] = await Promise.all([
      this.listChargesByTenant(tenantId),
      this.listPaymentsByTenant(tenantId),
    ]);
    await Promise.all([
      ...charges.map(c => this.deleteChargeEntry(c.id)),
      ...payments.map(p => this.deletePaymentEntry(p.id)),
    ]);
    return { chargesCleared: charges.length, paymentsCleared: payments.length };
  }

  static async listByTenant(tenantId: string): Promise<LedgerEntry[]> {
    const { Items = [] } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `LEDGER#${tenantId}`,
      },
    }));
    return (Items as LedgerEntry[]).filter(e => !e.deletedAt);
  }

  static async listChargesByTenant(tenantId: string): Promise<ChargeEntry[]> {
    const { Items = [] } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':gsi1pk': `LEDGER#${tenantId}`,
        ':prefix': 'CHARGE#',
      },
    }));
    const charges = (Items as ChargeEntry[]).filter(e => !e.deletedAt);
    charges.sort((a, b) => a.billingMonth.localeCompare(b.billingMonth));
    return charges;
  }

  static async listPaymentsByTenant(tenantId: string): Promise<PaymentEntry[]> {
    const { Items = [] } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':gsi1pk': `LEDGER#${tenantId}`,
        ':prefix': 'PAYMENT#',
      },
      ScanIndexForward: false,
    }));
    return (Items as PaymentEntry[]).filter(e => !e.deletedAt);
  }

  static async getLedgerSummary(
    tenantId: string,
    currentBillingMonth: string,
    penaltyEnabled: boolean,
    penaltyRate: number = DEFAULT_PENALTY_RATE,
  ): Promise<{ previousBalance: number; previousBalanceHistory: PreviousBalanceEntry[] }> {
    const charges = await this.listChargesByTenant(tenantId);
    const outstanding = charges.filter(c => c.principalOutstanding > 0);
    const previousBalanceHistory: PreviousBalanceEntry[] = outstanding.map(entry => ({
      invoiceNumber: entry.invoiceNumber || '',
      billingMonth: entry.billingMonth,
      billingLabel: formatBillingLabel(entry.billingMonth),
      amountDue: entry.principalAmount,
      amountPaid: entry.principalAmount - entry.principalOutstanding,
      outstanding: entry.principalOutstanding,
      penalty: penaltyEnabled ? pendingPenalty(entry, currentBillingMonth, penaltyRate) : 0,
    }));
    const previousBalance = previousBalanceHistory.reduce((s, e) => s + e.outstanding + e.penalty, 0);
    return { previousBalance, previousBalanceHistory };
  }

  // `penaltyEnabled` used to not be checked here at all — a payment for a tenant with
  // penalties disabled still had `pendingPenalty` computed and deducted first, penalty-before-
  // principal, exactly as if penalties were on. Only the read-side (getLedgerSummary/getLedger)
  // ever respected the flag. Fixed alongside threading the real penaltyRate through, since both
  // bugs are the same root cause: this function never received the tenant/building context it
  // needed to compute penalty correctly.
  static async recordPaymentWithFIFO(
    data: PaymentEntryInput,
    penaltyEnabled: boolean = true,
    penaltyRate: number = DEFAULT_PENALTY_RATE,
  ): Promise<PaymentEntry> {
    const charges = await this.listChargesByTenant(data.tenantId);
    const outstanding = charges.filter(c => c.principalOutstanding > 0);
    // Not the entered paymentDate's own month -- that let a backdated/late-recorded payment
    // retroactively assess penalty using whatever the building/tenant's *current* penalty
    // settings happen to be today, which can silently differ from what the Ledger view showed
    // right before the payment was recorded (real incident, docs/Ledger-Plan.md #28). Using the
    // same reference `getLedger()` uses keeps what's actually collected consistent with what was
    // on screen.
    const currentBillingMonth = await getPenaltyReferenceMonth(data.tenantId, charges);

    let remaining = round2(data.totalAmount);
    const appliedTo: AppliedTo[] = [];
    const mutations: { id: string; principalOutstanding: number; penaltyPaid: number }[] = [];

    for (const entry of outstanding) {
      if (remaining <= 0) break;
      const penaltyApplied = penaltyEnabled ? Math.min(remaining, pendingPenalty(entry, currentBillingMonth, penaltyRate)) : 0;
      remaining = round2(remaining - penaltyApplied);
      const principalApplied = Math.min(remaining, entry.principalOutstanding);
      remaining = round2(remaining - principalApplied);

      if (penaltyApplied > 0 || principalApplied > 0) {
        appliedTo.push({ chargeEntryId: entry.id, penaltyApplied, principalApplied });
        mutations.push({
          id: entry.id,
          principalOutstanding: round2(entry.principalOutstanding - principalApplied),
          penaltyPaid: round2(entry.penaltyPaid + penaltyApplied),
        });
      }
    }

    await Promise.all(mutations.map(m => this.updateChargeEntry(m.id, {
      principalOutstanding: m.principalOutstanding,
      penaltyPaid: m.penaltyPaid,
    })));

    return this.createPaymentEntry({ ...data, appliedTo });
  }
}
