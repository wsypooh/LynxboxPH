import { ddbDocClient } from '../lib/dynamodb';
import { Invoice, InvoiceInput, Payment, createInvoice } from '../models/invoice';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

export class InvoiceRepository {
  static async create(data: InvoiceInput): Promise<Invoice> {
    const existing = await this.listByOwnerMonth(data.ownerId, data.billingMonth);
    const seq = existing.length + 1;
    const invoiceNumber = `INV-${data.billingMonth}-${String(seq).padStart(4, '0')}`;
    const invoice = createInvoice(data, invoiceNumber);
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...invoice },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    return invoice;
  }

  static async findById(id: string): Promise<Invoice | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `INVOICE#${id}`, SK: `INVOICE#${id}` },
    }));
    return Item ? (Item as Invoice) : null;
  }

  static async update(id: string, updates: Partial<Invoice>): Promise<Invoice | null> {
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

    if (expressions.length === 0) return this.findById(id);

    expressions.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = now;

    const { Attributes } = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `INVOICE#${id}`, SK: `INVOICE#${id}` },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    return Attributes as Invoice || null;
  }

  static async delete(id: string): Promise<boolean> {
    const updated = await this.update(id, { deletedAt: new Date().toISOString() });
    return !!updated;
  }

  static async listByTenant(tenantId: string): Promise<Invoice[]> {
    const { Items = [] } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':gsi1pk': `TENANT#${tenantId}`,
        ':prefix': 'INVOICE#',
      },
      ScanIndexForward: false,
    }));
    return (Items as Invoice[]).filter(i => !i.deletedAt);
  }

  static async listByOwner(ownerId: string, tenantIds: string[]): Promise<Invoice[]> {
    const all = await Promise.all(tenantIds.map(id => this.listByTenant(id)));
    const flat = all.flat();
    flat.sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
    return flat;
  }

  static async listByOwnerMonth(ownerId: string, billingMonth: string): Promise<Invoice[]> {
    const { Items = [] } = await ddbDocClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pkPrefix) AND ownerId = :ownerId AND billingMonth = :billingMonth',
      ExpressionAttributeValues: {
        ':pkPrefix': 'INVOICE#',
        ':ownerId': ownerId,
        ':billingMonth': billingMonth,
      },
    }));
    return Items as Invoice[];
  }

  static async getUnpaidByTenant(tenantId: string): Promise<Invoice[]> {
    const all = await this.listByTenant(tenantId);
    return all.filter(inv => inv.status !== 'paid');
  }

  static async recordPayment(id: string, payment: Payment, changedBy: string): Promise<Invoice | null> {
    const invoice = await this.findById(id);
    if (!invoice) return null;

    const payments = [...invoice.payments, payment];
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = invoice.totalDue - amountPaid;
    const newStatus = outstanding <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'sent';

    const statusHistory = invoice.statusHistory ?? [];
    if (newStatus !== invoice.status) {
      statusHistory.push({ from: invoice.status, to: newStatus, changedAt: new Date().toISOString(), changedBy });
    }

    return this.update(id, { payments, amountPaid, outstanding, status: newStatus, statusHistory });
  }
}
