import { ddbDocClient, EntityType } from '../lib/dynamodb';
import { PromoCode, PromoCodeInput, createPromoCode, normalizeCode } from '../models/promoCode';
import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

function codeKey(code: string) {
  const normalized = normalizeCode(code);
  return { PK: `PROMO_CODE#${normalized}`, SK: `PROMO_CODE#${normalized}` };
}

export class PromoCodeRepository {
  static async create(data: PromoCodeInput): Promise<PromoCode> {
    const promo = createPromoCode(data);
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...promo },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    return promo;
  }

  static async findByCode(code: string): Promise<PromoCode | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: codeKey(code),
    }));
    return Item ? (Item as PromoCode) : null;
  }

  // A field that's `undefined` in `updates` is left untouched (the standard convention
  // for this repo layer); a field explicitly set to `null` is REMOVED from the item —
  // needed for optional fields like maxRedemptions/expiresAt, since JSON.stringify drops
  // `undefined` keys entirely, so "clear this field" can't be expressed by omission alone.
  static async update(code: string, updates: Partial<PromoCode>): Promise<PromoCode | null> {
    const now = new Date().toISOString();
    const setExpressions: string[] = [];
    const removeExpressions: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'entityType', 'createdAt', 'id', 'code'].includes(key)) return;
      names[`#${key}`] = key;
      if (value === null) {
        removeExpressions.push(`#${key}`);
      } else {
        setExpressions.push(`#${key} = :${key}`);
        values[`:${key}`] = value;
      }
    });

    if (setExpressions.length === 0 && removeExpressions.length === 0) return this.findByCode(code);

    setExpressions.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = now;

    const { Attributes } = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: codeKey(code),
      UpdateExpression: `SET ${setExpressions.join(', ')}${removeExpressions.length ? ` REMOVE ${removeExpressions.join(', ')}` : ''}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    return (Attributes as PromoCode) || null;
  }

  // Increments the redemption counter — used when a payment submission using this code
  // gets approved. A plain ADD, no transaction: matches this repo layer's existing
  // no-transactions convention (e.g. AccountRepository.incrementMonthlyInvoiceCount).
  static async incrementRedemptionCount(code: string): Promise<void> {
    await ddbDocClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: codeKey(code),
      UpdateExpression: 'ADD redemptionCount :one SET updatedAt = :now',
      ExpressionAttributeValues: { ':one': 1, ':now': new Date().toISOString() },
    }));
  }

  // Admin "list all codes" — low-cardinality (a handful of promo codes at any given
  // time), same Scan tradeoff as PlatformAdminRepository elsewhere in this codebase.
  static async listAll(): Promise<PromoCode[]> {
    const items: PromoCode[] = [];
    let ExclusiveStartKey: Record<string, any> | undefined;

    do {
      const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: { ':entityType': EntityType.PROMO_CODE },
        ExclusiveStartKey,
      }));
      items.push(...(Items as PromoCode[]));
      ExclusiveStartKey = LastEvaluatedKey;
    } while (ExclusiveStartKey);

    return items;
  }

  // Public pricing page / plan-picker: the currently-active sitewide auto-apply promo,
  // if any. Built on listAll() — fine at this scale, and this endpoint is low-traffic.
  static async findActiveAutoApply(): Promise<PromoCode | null> {
    const all = await this.listAll();
    const now = Date.now();
    return all.find(p =>
      p.autoApply &&
      p.active &&
      (!p.startsAt || new Date(p.startsAt).getTime() <= now) &&
      (!p.expiresAt || new Date(p.expiresAt).getTime() > now) &&
      (p.maxRedemptions === undefined || p.redemptionCount < p.maxRedemptions)
    ) ?? null;
  }
}
