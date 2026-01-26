import { ddbDocClient } from '../lib/dynamodb';
import { Property, createProperty, PropertyInput } from '../models/property';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { EntityType, BaseEntity } from '../lib/dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

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
    console.log('listByType called with type:', type);
    console.log('Using scan with FilterExpression for type:', type);
    
    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#type = :type AND begins_with(PK, :pkPrefix)',
      ExpressionAttributeNames: {
        '#type': 'type'
      },
      ExpressionAttributeValues: {
        ':type': type,
        ':pkPrefix': 'PROPERTY#'
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey
    }));

    console.log('Scan returned', Items.length, 'items for type', type);

    return {
      items: Items as Property[],
      lastEvaluatedKey: LastEvaluatedKey
    };
  }

  static async listByOwner(
    ownerId: string,
    limit: number = 10,
    lastEvaluatedKey?: Record<string, any>,
    sortBy?: 'price' | 'area' | 'date' | 'views',
    sortOrder?: 'asc' | 'desc'
  ): Promise<{ items: Property[]; lastEvaluatedKey?: Record<string, any> }> {
    // Default sort is by date (most recent first)
    let scanIndexForward = false;
    
    // For DynamoDB, we need to handle sorting differently
    // Since we're using GSI1 which sorts by GSI1SK (createdAt), we can only sort by date efficiently
    // For other sort fields, we'll need to sort in memory
    let queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `USER#${ownerId}`
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
      ScanIndexForward: sortBy === 'date' ? sortOrder === 'asc' : false // Always get newest first for non-date sorts
    });

    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(queryCommand);
    let items = Items as Property[];
    
    // Apply in-memory sorting for non-date fields
    if (sortBy && sortBy !== 'date') {
      items = this.sortProperties(items, sortBy, sortOrder);
    } else if (sortBy === 'date' && sortOrder === 'asc') {
      // If sorting by date ascending, reverse the default descending order
      items = items.reverse();
    }

    return {
      items,
      lastEvaluatedKey: LastEvaluatedKey
    };
  }

  static async listByTypeAndOwner(
    type: string,
    ownerId: string,
    limit: number = 10,
    lastEvaluatedKey?: Record<string, any>,
    sortBy?: 'price' | 'area' | 'date' | 'views',
    sortOrder?: 'asc' | 'desc'
  ): Promise<{ items: Property[]; lastEvaluatedKey?: Record<string, any> }> {
    let queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      // GSI1 uses SK as HASH key in the index
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      FilterExpression: 'begins_with(SK, :skPrefix) AND #type = :type',
      ExpressionAttributeNames: {
        '#type': 'type'
      },
      ExpressionAttributeValues: {
        ':gsi1pk': `USER#${ownerId}`,
        ':skPrefix': 'PROPERTY#',
        ':type': type
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
      ScanIndexForward: sortBy === 'date' ? sortOrder === 'asc' : false // Always get newest first for non-date sorts
    });

    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(queryCommand);
    let items = Items as Property[];
    
    // Apply in-memory sorting for non-date fields
    if (sortBy && sortBy !== 'date') {
      items = this.sortProperties(items, sortBy, sortOrder);
    } else if (sortBy === 'date' && sortOrder === 'asc') {
      // If sorting by date ascending, reverse the default descending order
      items = items.reverse();
    }

    return {
      items,
      lastEvaluatedKey: LastEvaluatedKey
    };
  }

  static async listAllAvailableProperties(
    limit: number = 10,
    lastEvaluatedKey?: Record<string, any>,
    sortBy?: 'price' | 'area' | 'date' | 'views',
    sortOrder?: 'asc' | 'desc'
  ): Promise<{ items: Property[]; lastEvaluatedKey?: Record<string, any> }> {
    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pkPrefix) AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':pkPrefix': 'PROPERTY#',
        ':status': 'available'
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey
    }));

    let items = Items as Property[];
    
    // Apply in-memory sorting
    if (sortBy) {
      items = this.sortProperties(items, sortBy, sortOrder);
    }

    return {
      items,
      lastEvaluatedKey: LastEvaluatedKey
    };
  }

  static async listPublicProperties(
    filters: {
      type?: string;
      city?: string;
      limit: number;
      lastEvaluatedKey?: Record<string, any>;
      sortBy?: 'price' | 'area' | 'date' | 'views';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ items: Property[]; lastEvaluatedKey?: Record<string, any> }> {
    let filterExpression = 'begins_with(PK, :pkPrefix) AND #status = :status';
    let expressionAttributeNames: Record<string, string> = {
      '#status': 'status'
    };
    let expressionAttributeValues: Record<string, any> = {
      ':pkPrefix': 'PROPERTY#',
      ':status': 'available'
    };

    // Add type filter
    if (filters.type) {
      filterExpression += ' AND #type = :type';
      expressionAttributeNames['#type'] = 'type';
      expressionAttributeValues[':type'] = filters.type;
    }

    // Add city filter (nested in location.city)
    if (filters.city) {
      filterExpression += ' AND location.city = :city';
      expressionAttributeValues[':city'] = filters.city;
    }

    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: filters.limit,
      ExclusiveStartKey: filters.lastEvaluatedKey
    }));

    let items = Items as Property[];
    
    // Apply in-memory sorting
    if (filters.sortBy) {
      items = this.sortProperties(items, filters.sortBy, filters.sortOrder);
    }

    return {
      items,
      lastEvaluatedKey: LastEvaluatedKey
    };
  }

  static async search(query: string, limit: number = 10): Promise<Property[]> {
    // Note: DynamoDB FilterExpression can't access nested attributes directly
    // We'll scan all properties and filter in memory for now
    // For production, consider using Amazon OpenSearch or similar
    const { Items = [] } = await ddbDocClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pkPrefix)',
      ExpressionAttributeValues: {
        ':pkPrefix': 'PROPERTY#'
      },
      Limit: limit * 2 // Get more items to account for in-memory filtering
    }));

    // In-memory filtering for all searchable fields
    const properties = Items as Property[];
    const filteredProperties = properties.filter(property => {
      const searchLower = query.toLowerCase();
      const titleMatch = property.title?.toLowerCase().includes(searchLower);
      const descriptionMatch = property.description?.toLowerCase().includes(searchLower);
      const addressMatch = property.location?.address?.toLowerCase().includes(searchLower);
      const cityMatch = property.location?.city?.toLowerCase().includes(searchLower);
      const provinceMatch = property.location?.province?.toLowerCase().includes(searchLower);
      
      return titleMatch || descriptionMatch || addressMatch || cityMatch || provinceMatch;
    });

    return filteredProperties.slice(0, limit);
  }

  static async filter(filters: {
    type?: string[];
    priceMin?: number;
    priceMax?: number;
    minArea?: number;
    maxArea?: number;
    location?: string;
    features?: {
      parking?: boolean;
      furnished?: boolean;
      aircon?: boolean;
      wifi?: boolean;
      security?: boolean;
    };
    query?: string;
    limit?: number;
    ownerId?: string;  // For user-specific filtering
    status?: string;   // For status filtering (e.g., 'available')
    sortBy?: 'price' | 'area' | 'date' | 'views';
    sortOrder?: 'asc' | 'desc';
    lastKey?: any;     // For pagination
  }): Promise<{ items: Property[]; lastKey?: any }> {
    console.log('=== PROPERTY FILTER DEBUG ===');
    console.log('Received filters:', JSON.stringify(filters, null, 2));
    console.log('DynamoDB scan limit:', (filters.limit || 50) * 5);
    console.log('Filtering for types:', filters.type);
    console.log('Filtering for status:', filters.status);
    
    // Build filter expression based on provided filters
    let filterExpression = 'begins_with(PK, :pkPrefix)';
    let expressionAttributeNames: Record<string, string> = {};
    let expressionAttributeValues: Record<string, any> = {
      ':pkPrefix': 'PROPERTY#'
    };

    // Add owner filter if provided
    if (filters.ownerId) {
      filterExpression += ' AND GSI1PK = :ownerId';
      expressionAttributeValues[':ownerId'] = `USER#${filters.ownerId}`;
    }

    // Add status filter if provided
    if (filters.status) {
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = filters.status;
      filterExpression += ' AND #status = :status';
    }

    // For now, we'll get filtered properties and apply complex filters in memory
    // DynamoDB FilterExpression has limitations with nested attributes
    const scanParams: any = {
      TableName: TABLE_NAME,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: (filters.limit || 50) * 5 // Get more items for in-memory filtering
    };
    
    // Add pagination if lastKey is provided
    if (filters.lastKey) {
      scanParams.ExclusiveStartKey = filters.lastKey;
    }
    
    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand(scanParams));

    const properties = Items as Property[];
    console.log(`DynamoDB returned ${properties.length} items`);
    console.log('LastEvaluatedKey:', LastEvaluatedKey ? 'Present (more items available)' : 'Null (no more items)');
    
    const filteredProperties = properties.filter(property => {
      let hasSearchMatch = true;
      let hasFilterMatch = true;
      
      // Text search filter (AND logic across all words in query)
      if (filters.query) {
        const queryWords = filters.query.toLowerCase().split(' ').filter(word => word.length > 0);
        const searchableText = [
          property.title,
          property.description,
          property.location?.address,
          property.location?.city,
          property.location?.province
        ].filter(Boolean).join(' ').toLowerCase();
        
        // All words must be found in the searchable text
        hasSearchMatch = queryWords.every(word => searchableText.includes(word));
      }
      
      // Check if any filters are provided (excluding search)
      const hasFilters = (
        (filters.type && filters.type.length > 0) ||
        filters.priceMin !== undefined ||
        filters.priceMax !== undefined ||
        filters.minArea !== undefined ||
        filters.maxArea !== undefined ||
        filters.location ||
        filters.features
      );
      
      // Filter matching (OR logic between different filter types)
      if (hasFilters) {
        const filterMatches = [];
        
        // Type filter (OR logic within types)
        if (filters.type && filters.type.length > 0) {
          const typeMatch = filters.type.includes(property.type);
          filterMatches.push(typeMatch);
          console.log(`Type filter: property.type=${property.type}, filters.type=${JSON.stringify(filters.type)}, match=${typeMatch}`);
        }
        
        // Price filters (OR logic between min and max)
        let priceMatch = true;
        if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
          priceMatch = property.price >= filters.priceMin && property.price <= filters.priceMax;
        } else if (filters.priceMin !== undefined) {
          priceMatch = property.price >= filters.priceMin;
        } else if (filters.priceMax !== undefined) {
          priceMatch = property.price <= filters.priceMax;
        }
        if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
          filterMatches.push(priceMatch);
        }
        
        // Area filters (OR logic between min and max)
        let areaMatch = true;
        if (filters.minArea !== undefined && filters.maxArea !== undefined) {
          areaMatch = property.features?.area >= filters.minArea && property.features?.area <= filters.maxArea;
        } else if (filters.minArea !== undefined) {
          areaMatch = property.features?.area >= filters.minArea;
        } else if (filters.maxArea !== undefined) {
          areaMatch = property.features?.area <= filters.maxArea;
        }
        if (filters.minArea !== undefined || filters.maxArea !== undefined) {
          filterMatches.push(areaMatch);
        }
        
        // Location filter
        if (filters.location) {
          const locationLower = filters.location.toLowerCase();
          const cityMatch = property.location?.city?.toLowerCase().includes(locationLower);
          const provinceMatch = property.location?.province?.toLowerCase().includes(locationLower);
          const addressMatch = property.location?.address?.toLowerCase().includes(locationLower);
          filterMatches.push(cityMatch || provinceMatch || addressMatch);
        }
        
        // Feature filters (OR logic between different features)
        if (filters.features) {
          const featureMatches = [];
          
          // Parking is a number (number of parking spaces), but filter expects boolean (has parking)
          if (filters.features.parking !== undefined) {
            const hasParking = (property.features?.parking || 0) > 0;
            featureMatches.push(hasParking === filters.features.parking);
          }
          // Other features are booleans
          if (filters.features.furnished !== undefined) {
            featureMatches.push(property.features?.furnished === filters.features.furnished);
          }
          if (filters.features.aircon !== undefined) {
            featureMatches.push(property.features?.aircon === filters.features.aircon);
          }
          if (filters.features.wifi !== undefined) {
            featureMatches.push(property.features?.wifi === filters.features.wifi);
          }
          if (filters.features.security !== undefined) {
            featureMatches.push(property.features?.security === filters.features.security);
          }
          
          // OR logic for features - at least one feature must match if features are specified
          if (featureMatches.length > 0) {
            filterMatches.push(featureMatches.some(match => match));
          }
        }
        
        // OR logic between different filter categories - at least one filter category must match
        hasFilterMatch = filterMatches.some(match => match);
      }
      
      // Final logic:
      // - If search text provided: must match search AND (filters OR no filters)
      // - If no search text: must match filters OR no filters
      if (filters.query) {
        // If search text provided, must match search
        // If filters also provided, must match at least one filter too
        if (hasFilters) {
          return hasSearchMatch && hasFilterMatch;
        } else {
          return hasSearchMatch;
        }
      } else {
        // If no search text, must match filters OR no filters
        return !hasFilters || hasFilterMatch;
      }
    });

    console.log(`After filtering: ${filteredProperties.length} items`);
    
    let finalItems = filteredProperties.slice(0, filters.limit || 50);
    console.log(`After final limit (${filters.limit || 50}): ${finalItems.length} items`);
    
    // Apply in-memory sorting
    if (filters.sortBy) {
      finalItems = this.sortProperties(finalItems, filters.sortBy, filters.sortOrder);
    }
    
    return {
      items: finalItems,
      lastKey: LastEvaluatedKey
    };
  }

  static async incrementViewCount(id: string): Promise<void> {
    try {
      await ddbDocClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: createPropertyKeys(id),
        UpdateExpression: 'ADD viewCount :inc',
        ExpressionAttributeValues: {
          ':inc': 1
        },
        ReturnValues: 'NONE'
      }));
    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Don't throw error - view count increment shouldn't break the main flow
    }
  }

  private static sortProperties(
    properties: Property[], 
    sortBy: 'price' | 'area' | 'date' | 'views', 
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Property[] {
    const sorted = [...properties].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'area':
          aValue = a.features?.area || 0;
          bValue = b.features?.area || 0;
          break;
        case 'date':
          aValue = new Date(a.createdAt || '').getTime();
          bValue = new Date(b.createdAt || '').getTime();
          break;
        case 'views':
          aValue = a.viewCount || 0;
          bValue = b.viewCount || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return sorted;
  }
}
