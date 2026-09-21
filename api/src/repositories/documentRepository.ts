import { ddbDocClient } from '../lib/dynamodb';
import { Document, DocumentInput, DocumentParentType, createDocument } from '../models/document';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

export class DocumentRepository {
  static async create(data: DocumentInput): Promise<Document> {
    const document = createDocument(data);
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...document },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
    return document;
  }

  static async findById(id: string): Promise<Document | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DOCUMENT#${id}`, SK: `DOCUMENT#${id}` },
    }));
    return Item ? (Item as Document) : null;
  }

  static async update(id: string, updates: Partial<Document>): Promise<Document | null> {
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
      Key: { PK: `DOCUMENT#${id}`, SK: `DOCUMENT#${id}` },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    return Attributes as Document || null;
  }

  static async delete(id: string): Promise<boolean> {
    const updated = await this.update(id, { deletedAt: new Date().toISOString() });
    return !!updated;
  }

  static async listByParent(ownerId: string, parentType: DocumentParentType, parentId: string): Promise<Document[]> {
    const { Items = [] } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':gsi1pk': `USER#${ownerId}`,
        ':prefix': `DOCUMENT#${parentType}#${parentId}#`,
      },
    }));
    return (Items as Document[]).filter(d => !d.deletedAt);
  }
}
