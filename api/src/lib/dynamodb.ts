import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export const ddbDocClient = DynamoDBDocument.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export enum EntityType {
  PROPERTY = 'PROPERTY',
  USER = 'USER'
}

export function createPK(entityType: EntityType, id: string): string {
  return `${entityType}#${id}`;
}

export function createGSI1PK(entityType: EntityType, id: string): string {
  return `${entityType}#${id}`;
}

export interface BaseEntity {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  entityType: EntityType;
  createdAt: string;
  updatedAt: string;
}
