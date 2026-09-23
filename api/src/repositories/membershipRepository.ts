import { ddbDocClient } from '../lib/dynamodb';
import { Member, MemberInput, createMember } from '../models/member';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

export class MembershipRepository {
  static async create(data: MemberInput): Promise<Member> {
    const member = createMember(data);
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...member },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    return member;
  }

  static async get(accountId: string, sub: string): Promise<Member | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ACCOUNT#${accountId}`, SK: `MEMBER#${sub}` },
    }));
    if (!Item || (Item as Member).deletedAt) return null;
    return Item as Member;
  }

  static async update(accountId: string, sub: string, updates: Partial<Member>): Promise<Member | null> {
    const now = new Date().toISOString();
    const expressions: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && !['PK', 'SK', 'GSI1PK', 'GSI1SK', 'entityType', 'createdAt', 'id', 'accountId', 'sub'].includes(key)) {
        expressions.push(`#${key} = :${key}`);
        names[`#${key}`] = key;
        values[`:${key}`] = value;
      }
    });

    if (expressions.length === 0) return this.get(accountId, sub);

    expressions.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = now;

    const { Attributes } = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ACCOUNT#${accountId}`, SK: `MEMBER#${sub}` },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    return Attributes as Member || null;
  }

  static async remove(accountId: string, sub: string): Promise<boolean> {
    const updated = await this.update(accountId, sub, { deletedAt: new Date().toISOString() });
    return !!updated;
  }

  static async listByAccount(accountId: string): Promise<Member[]> {
    const { Items = [] } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `ACCOUNT#${accountId}`,
        ':prefix': 'MEMBER#',
      },
    }));
    return (Items as Member[]).filter(m => !m.deletedAt);
  }

  // GSI1PK = USER#<sub> is also used by Property/Tenant/Building/Document for "owned by this user" —
  // always filter GSI1SK to MEMBER# to avoid mixing results with those owned-entity rows.
  static async listByUser(sub: string): Promise<Member[]> {
    const { Items = [] } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':gsi1pk': `USER#${sub}`,
        ':prefix': 'MEMBER#',
      },
    }));
    return (Items as Member[]).filter(m => !m.deletedAt);
  }
}
