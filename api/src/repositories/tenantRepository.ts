import { ddbDocClient } from '../lib/dynamodb';
import { Tenant, TenantInput, TenantContract, createTenant } from '../models/tenant';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

export class TenantRepository {
  static async create(data: TenantInput): Promise<Tenant> {
    let tenantCode = data.tenantCode;
    if (!tenantCode) {
      const existing = await this.listByOwner(data.ownerId);
      const seq = existing.length + 1;
      tenantCode = `T-${String(seq).padStart(3, '0')}`;
    }
    const tenant = createTenant(data, tenantCode);
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...tenant },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    return tenant;
  }

  static async findById(id: string): Promise<Tenant | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `TENANT#${id}`, SK: `TENANT#${id}` },
    }));
    return Item ? (Item as Tenant) : null;
  }

  static async update(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
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
      Key: { PK: `TENANT#${id}`, SK: `TENANT#${id}` },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    return Attributes as Tenant || null;
  }

  static async addContract(id: string, contract: TenantContract): Promise<Tenant | null> {
    const tenant = await this.findById(id);
    if (!tenant) return null;
    const contracts = [...(tenant.contracts || []), contract];
    return this.update(id, { contracts });
  }

  static async delete(id: string): Promise<boolean> {
    const updated = await this.update(id, { deletedAt: new Date().toISOString() });
    return !!updated;
  }

  static async listByOwner(ownerId: string): Promise<Tenant[]> {
    const { Items = [] } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':gsi1pk': `USER#${ownerId}`,
        ':prefix': 'TENANT#',
      },
    }));
    return (Items as Tenant[]).filter(t => !t.deletedAt);
  }

  static async listByBuilding(ownerId: string, buildingId: string): Promise<Tenant[]> {
    const all = await this.listByOwner(ownerId);
    return all.filter(t => t.buildingId === buildingId);
  }
}
