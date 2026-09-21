export type DocumentParentType = 'BUILDING' | 'TENANT';
export type DocumentCategory = 'sec_certificate' | 'business_permit' | 'lease_contract' | 'government_id' | 'other';

export interface Document {
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
  createdAt: string;
  updatedAt: string;
}

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  sec_certificate: 'SEC Certificate',
  business_permit: 'Business Permit',
  lease_contract: 'Lease Contract',
  government_id: 'Government ID',
  other: 'Other',
};
