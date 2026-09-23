import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Lambda functions should use IAM role credentials, not explicit credentials
const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-1'
});

export const ddbDocClient = DynamoDBDocumentClient.from(dynamoDbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

export enum EntityType {
  PROPERTY = 'PROPERTY',
  USER = 'USER',
  BUILDING = 'BUILDING',
  TENANT = 'TENANT',
  INVOICE = 'INVOICE',
  LEDGER_ENTRY = 'LEDGER_ENTRY',
  DOCUMENT = 'DOCUMENT',
  MEMBER = 'MEMBER'
}

export interface BaseEntity {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  entityType: EntityType;
  id: string;
  createdAt: string;
  updatedAt: string;
}
