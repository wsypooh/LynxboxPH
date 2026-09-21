import { v4 as uuidv4 } from 'uuid';
import { EntityType, BaseEntity } from '../lib/dynamodb';

export type DocumentParentType = 'BUILDING' | 'TENANT';
export type DocumentCategory = 'sec_certificate' | 'business_permit' | 'lease_contract' | 'government_id' | 'other';

export interface Document extends BaseEntity {
  [key: string]: any;
  id: string;
  ownerId: string;
  parentType: DocumentParentType;
  parentId: string;
  contractId?: string;
  category: DocumentCategory;
  fileName: string;
  s3Key: string;
  mimeType: string;
  fileSize: number;
  expiryDate?: string;
  notes?: string;
  deletedAt?: string;
}

export type DocumentInput = {
  id?: string;
  ownerId: string;
  parentType: DocumentParentType;
  parentId: string;
  contractId?: string;
  category: DocumentCategory;
  fileName: string;
  s3Key: string;
  mimeType: string;
  fileSize: number;
  expiryDate?: string;
  notes?: string;
};

export function createDocument(data: DocumentInput): Document {
  const now = new Date().toISOString();
  const id = data.id ?? uuidv4();
  return {
    PK: `DOCUMENT#${id}`,
    SK: `DOCUMENT#${id}`,
    GSI1PK: `USER#${data.ownerId}`,
    GSI1SK: `DOCUMENT#${data.parentType}#${data.parentId}#${id}`,
    entityType: EntityType.DOCUMENT,
    id,
    ownerId: data.ownerId,
    parentType: data.parentType,
    parentId: data.parentId,
    contractId: data.contractId,
    category: data.category,
    fileName: data.fileName,
    s3Key: data.s3Key,
    mimeType: data.mimeType,
    fileSize: data.fileSize,
    expiryDate: data.expiryDate,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };
}
