import { ddbDocClient } from '../lib/dynamodb';
import { Building, BuildingInput, createBuilding } from '../models/building';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

export class BuildingRepository {
  static async create(data: BuildingInput): Promise<Building> {
    const building = createBuilding(data);
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...building },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    return building;
  }

  static async findById(id: string): Promise<Building | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BUILDING#${id}`, SK: `BUILDING#${id}` },
    }));
    return Item ? (Item as Building) : null;
  }

  static async update(id: string, updates: Partial<Building>): Promise<Building | null> {
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
      Key: { PK: `BUILDING#${id}`, SK: `BUILDING#${id}` },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    return Attributes as Building || null;
  }

  static async delete(id: string): Promise<boolean> {
    const updated = await this.update(id, { deletedAt: new Date().toISOString() });
    return !!updated;
  }

  static async listByOwner(ownerId: string): Promise<Building[]> {
    const { Items = [] } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':gsi1pk': `USER#${ownerId}`,
        ':prefix': 'BUILDING#',
      },
    }));
    return (Items as Building[]).filter(b => !b.deletedAt);
  }
}
