import { ddbDocClient } from '../lib/dynamodb';
import {
  ChargeEntry, PaymentEntry, LedgerEntry, ChargeEntryInput, PaymentEntryInput, AppliedTo,
  createChargeEntry, createPaymentEntry,
} from '../models/ledgerEntry';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';
const PENALTY_RATE = 0.05;

export interface PreviousBalanceEntry {
  invoiceNumber: string;
  billingMonth: string;
  billingLabel: string;
  amountDue: number;
  amountPaid: number;
  outstanding: number;
  penalty: number;
}

function monthsOverdue(billingMonth: string, currentBillingMonth: string): number {
  const [chargeYear, chargeMonth] = billingMonth.split('-').map(Number);
  const [currentYear, currentMonth] = currentBillingMonth.split('-').map(Number);
  return Math.max(0, (currentYear - chargeYear) * 12 + (currentMonth - chargeMonth));
}

export function pendingPenalty(entry: ChargeEntry, currentBillingMonth: string): number {
  const overdue = monthsOverdue(entry.billingMonth, currentBillingMonth);
  const raw = Math.max(0, entry.principalOutstanding * PENALTY_RATE * overdue - entry.penaltyPaid);
  return Math.round(raw * 100) / 100;
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
      if (value !== undefined && !['PK', 'SK', 'GSI1PK', 'GSI1SK', 'entityType', 'createdAt', 'id'].includes(key)) {
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
    const charges = await this.listChargesByTenant(tenantId);
    const match = charges.find(c => c.invoiceId === invoiceId);
    if (!match) return false;
    return this.deleteChargeEntry(match.id);
  }

  static async updatePaymentEntry(id: string, updates: Partial<PaymentEntry>): Promise<PaymentEntry | null> {
    const now = new Date().toISOString();
    const expressions: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && !['PK', 'SK', 'GSI1PK', 'GSI1SK', 'entityType', 'createdAt', 'id'].includes(key)) {
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
    penaltyEnabled: boolean
  ): Promise<{ previousBalance: number; previousBalanceHistory: PreviousBalanceEntry[] }> {
    const charges = await this.listChargesByTenant(tenantId);
    const outstanding = charges.filter(c => c.principalOutstanding > 0);
    const previousBalanceHistory: PreviousBalanceEntry[] = outstanding.map(entry => ({
      invoiceNumber: entry.invoiceNumber || '',
      billingMonth: entry.billingMonth,
      billingLabel: entry.description,
      amountDue: entry.principalAmount,
      amountPaid: entry.principalAmount - entry.principalOutstanding,
      outstanding: entry.principalOutstanding,
      penalty: penaltyEnabled ? pendingPenalty(entry, currentBillingMonth) : 0,
    }));
    const previousBalance = previousBalanceHistory.reduce((s, e) => s + e.outstanding + e.penalty, 0);
    return { previousBalance, previousBalanceHistory };
  }

  static async recordPaymentWithFIFO(data: PaymentEntryInput): Promise<PaymentEntry> {
    const charges = await this.listChargesByTenant(data.tenantId);
    const outstanding = charges.filter(c => c.principalOutstanding > 0);
    const currentBillingMonth = data.paymentDate.slice(0, 7);

    let remaining = data.totalAmount;
    const appliedTo: AppliedTo[] = [];
    const mutations: { id: string; principalOutstanding: number; penaltyPaid: number }[] = [];

    for (const entry of outstanding) {
      if (remaining <= 0) break;
      const penaltyApplied = Math.min(remaining, pendingPenalty(entry, currentBillingMonth));
      remaining -= penaltyApplied;
      const principalApplied = Math.min(remaining, entry.principalOutstanding);
      remaining -= principalApplied;

      if (penaltyApplied > 0 || principalApplied > 0) {
        appliedTo.push({ chargeEntryId: entry.id, penaltyApplied, principalApplied });
        mutations.push({
          id: entry.id,
          principalOutstanding: entry.principalOutstanding - principalApplied,
          penaltyPaid: entry.penaltyPaid + penaltyApplied,
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
