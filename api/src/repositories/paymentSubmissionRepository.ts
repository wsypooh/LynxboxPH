import { ddbDocClient, EntityType } from '../lib/dynamodb';
import { PaymentSubmission, PaymentSubmissionInput, PaymentSubmissionStatus, createPaymentSubmission } from '../models/paymentSubmission';
import { GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

export class PaymentSubmissionRepository {
  static async create(data: PaymentSubmissionInput): Promise<PaymentSubmission> {
    const submission = createPaymentSubmission(data);
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...submission },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    return submission;
  }

  static async findById(id: string): Promise<PaymentSubmission | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PAYMENT_SUBMISSION#${id}`, SK: `PAYMENT_SUBMISSION#${id}` },
    }));
    return Item ? (Item as PaymentSubmission) : null;
  }

  static async update(id: string, updates: Partial<PaymentSubmission>): Promise<PaymentSubmission | null> {
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
      Key: { PK: `PAYMENT_SUBMISSION#${id}`, SK: `PAYMENT_SUBMISSION#${id}` },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    return (Attributes as PaymentSubmission) || null;
  }

  static async listByAccount(accountId: string): Promise<PaymentSubmission[]> {
    const { Items = [] } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':gsi1pk': `ACCOUNT#${accountId}`,
        ':prefix': 'PAYMENT_SUBMISSION#',
      },
      ScanIndexForward: false, // newest first
    }));
    return Items as PaymentSubmission[];
  }

  // Admin cross-account queue: no GSI covers "every submission across every account," so
  // this Scans the whole table — same accepted tradeoff as PlatformAdminRepository's
  // account-summary Scan at this project's current scale. Omit `status` to list all.
  static async listByStatus(status?: PaymentSubmissionStatus): Promise<PaymentSubmission[]> {
    const items: PaymentSubmission[] = [];
    let ExclusiveStartKey: Record<string, any> | undefined;
    const filterParts = ['entityType = :entityType'];
    const values: Record<string, any> = { ':entityType': EntityType.PAYMENT_SUBMISSION };
    if (status) {
      filterParts.push('#status = :status');
      values[':status'] = status;
    }

    do {
      const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterParts.join(' AND '),
        ExpressionAttributeNames: status ? { '#status': 'status' } : undefined,
        ExpressionAttributeValues: values,
        ExclusiveStartKey,
      }));
      items.push(...(Items as PaymentSubmission[]));
      ExclusiveStartKey = LastEvaluatedKey;
    } while (ExclusiveStartKey);

    return items;
  }

  static async listPending(): Promise<PaymentSubmission[]> {
    return this.listByStatus('pending');
  }
}
