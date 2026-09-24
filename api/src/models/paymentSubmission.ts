import { v4 as uuidv4 } from 'uuid';
import { EntityType, BaseEntity } from '../lib/dynamodb';
import { PaidPlan, BillingCycle } from './account';

export type PaymentMethod = 'gcash' | 'maya' | 'bank_transfer';
export type PaymentSubmissionStatus = 'pending' | 'verified' | 'rejected';

// docs/Payments-and-Subscription-Plan.md — append-only history, no soft delete.
export interface PaymentSubmission extends BaseEntity {
  [key: string]: any;
  accountId: string;
  submittedBySub: string;
  requestedPlan: PaidPlan;
  requestedBillingCycle: BillingCycle;
  method: PaymentMethod;
  referenceNumber: string;
  amountClaimed: number;
  promoCode?: string;
  amountExpected: number;
  // Proof file lives directly on this record — NOT a Document entity, and not counted
  // against the Documents feature's maxDocuments limit. Own S3 prefix
  // (accounts/<accountId>/payment-proofs), separate from DocumentRepository entirely.
  proofS3Key: string;
  proofFileName: string;
  status: PaymentSubmissionStatus;
  adminNotes?: string;
  verifiedBySub?: string;
  verifiedAt?: string;
  submittedAt: string;
}

export type PaymentSubmissionInput = Omit<PaymentSubmission, keyof BaseEntity | 'status' | 'submittedAt'> & { id?: string };

export function createPaymentSubmission(data: PaymentSubmissionInput): PaymentSubmission {
  const now = new Date().toISOString();
  const id = data.id || uuidv4();

  return {
    PK: `PAYMENT_SUBMISSION#${id}`,
    SK: `PAYMENT_SUBMISSION#${id}`,
    GSI1PK: `ACCOUNT#${data.accountId}`,
    // Deliberately just <submittedAt>#<id>, not status — status changes after creation
    // (pending -> verified/rejected) and this key must stay sorted chronologically for
    // listByAccount's history view regardless. Cross-account "list pending" uses a table
    // Scan instead (see PaymentSubmissionRepository.listPending), so status never needs
    // to be part of this key.
    GSI1SK: `PAYMENT_SUBMISSION#${now}#${id}`,
    entityType: EntityType.PAYMENT_SUBMISSION,
    id,
    createdAt: now,
    updatedAt: now,
    accountId: data.accountId,
    submittedBySub: data.submittedBySub,
    requestedPlan: data.requestedPlan,
    requestedBillingCycle: data.requestedBillingCycle,
    method: data.method,
    referenceNumber: data.referenceNumber,
    amountClaimed: data.amountClaimed,
    promoCode: data.promoCode,
    amountExpected: data.amountExpected,
    proofS3Key: data.proofS3Key,
    proofFileName: data.proofFileName,
    status: 'pending',
    submittedAt: now,
  };
}
