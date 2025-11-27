import { ddbDocClient } from '../lib/dynamodb';
import { Property, createProperty } from '../models/property';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME || 'ListSpace';

export class PropertyRepository {
  static async create(property: Omit<Property, keyof Property>): Promise<Property> {
    const newProperty = createProperty(property as any);
    
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: newProperty,
      ConditionExpression: 'attribute_not_exists(PK)'
    }));

    return newProperty;
  }

  static async findById(id: string): Promise<Property | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PROPERTY#${id}`,
        SK: `PROPERTY#${id}`
      }
    }));

    return Item as Property || null;
  }

  static async update(id: string, updates: Partial<Property>): Promise<Property | null> {
    const now = new Date().toISOString();
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    // Build update expression dynamically
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && !['PK', 'SK', 'GSI1PK', 'GSI1SK', 'entityType', 'createdAt'].includes(key)) {
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    if (updateExpressions.length === 0) {
      return this.findById(id);
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    const { Attributes } = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PROPERTY#${id}`,
        SK: `PROPERTY#${id}`
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return Attributes as Property || null;
  }

  static async delete(id: string): Promise<boolean> {
    const { Attributes } = await ddbDocClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PROPERTY#${id}`,
        SK: `PROPERTY#${id}`
      },
      ReturnValues: 'ALL_OLD'
    }));

    return !!Attributes;
  }

  static async listByType(type: string, limit: number = 10, lastEvaluatedKey?: any): Promise<{ items: Property[]; lastEvaluatedKey?: any }> {
    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `PROPERTY#${type.toUpperCase()}`,
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
      ScanIndexForward: false // Sort by newest first
    }));

    return {
      items: Items as Property[],
      lastEvaluatedKey: LastEvaluatedKey
    };
  }

  static async search(query: string, limit: number = 10): Promise<Property[]> {
    // Note: This is a basic implementation. For production, consider using Amazon OpenSearch or similar
    const { Items = [] } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'begins_with(GSI1PK, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': 'PROPERTY#',
        ':query': query
      },
      FilterExpression: 'contains(#title, :query) OR contains(#description, :query) OR contains(#address, :query)',
      ExpressionAttributeNames: {
        '#title': 'title',
        '#description': 'description',
        '#address': 'location.address'
      },
      Limit: limit
    }));

    return Items as Property[];
  }
}
