import { ddbDocClient } from '../lib/dynamodb';
import { Property, createProperty, PropertyInput } from '../models/property';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { EntityType, BaseEntity } from '../lib/dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'listspace-ph-dev';

// Helper function to create property keys
function createPropertyKeys(id: string) {
  return {
    PK: `PROPERTY#${id}`,
    SK: `PROPERTY#${id}`
  };
}

export class PropertyRepository {
  static async create(propertyData: PropertyInput): Promise<Property> {
    const property = createProperty(propertyData);
    
    // Convert to a plain object with string index signature
    const dynamoItem: Record<string, any> = {
      ...property,
      // Ensure all required fields are properly typed for DynamoDB
      PK: property.PK,
      SK: property.SK,
      GSI1PK: property.GSI1PK,
      GSI1SK: property.GSI1SK,
      entityType: property.entityType,
      id: property.id,
      viewCount: property.viewCount,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
      // Add all other properties
      ...propertyData
    };

    // Remove any undefined values
    Object.keys(dynamoItem).forEach((key: string) => {
      if (dynamoItem[key] === undefined) {
        delete dynamoItem[key];
      }
    });

    console.log('Saving to DynamoDB:', {
      TableName: TABLE_NAME,
      Item: dynamoItem
    });

    try {
      await ddbDocClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: dynamoItem,
        ConditionExpression: 'attribute_not_exists(PK)'
      }));
      console.log('Successfully saved property to DynamoDB');
      return property;
    } catch (error) {
      console.error('Error saving to DynamoDB:', error);
      throw error;
    }
  }

  static async findById(id: string): Promise<Property | null> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: createPropertyKeys(id)
    }));

    if (!Item) return null;
    
    // Convert DynamoDB item to Property
    return {
      ...Item,
      // Ensure all required fields are present
      id: Item.id,
      PK: Item.PK,
      SK: Item.SK,
      entityType: Item.entityType,
      createdAt: Item.createdAt,
      updatedAt: Item.updatedAt,
      viewCount: Item.viewCount || 0,
    } as Property;
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
      Key: createPropertyKeys(id),
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
      Key: createPropertyKeys(id),
      ReturnValues: 'ALL_OLD'
    }));

    return !!Attributes;
  }

  static async listByType(
    type: string, 
    limit: number = 10, 
    lastEvaluatedKey?: Record<string, any>
  ): Promise<{ items: Property[]; lastEvaluatedKey?: Record<string, any> }> {
    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      // GSI1 uses GSI1PK as HASH key and GSI1SK as RANGE key
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

  static async listByOwner(
    ownerId: string,
    limit: number = 10,
    lastEvaluatedKey?: Record<string, any>
  ): Promise<{ items: Property[]; lastEvaluatedKey?: Record<string, any> }> {
    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      // GSI1 uses SK as HASH key in the index
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      FilterExpression: 'begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':gsi1pk': `USER#${ownerId}`,
        ':skPrefix': 'PROPERTY#'
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
      ScanIndexForward: false
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
      KeyConditionExpression: 'GSI1PK = :type',
      FilterExpression: 'contains(#title, :query) OR contains(#description, :query) OR contains(#address, :query)',
      ExpressionAttributeValues: {
        ':type': 'PROPERTY#ALL',
        ':query': query.toLowerCase()
      },
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
