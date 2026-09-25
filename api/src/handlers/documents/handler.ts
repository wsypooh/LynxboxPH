import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DocumentRepository } from '../../repositories/documentRepository';
import { BuildingRepository } from '../../repositories/buildingRepository';
import { TenantRepository } from '../../repositories/tenantRepository';
import { S3Service } from '../../lib/s3';
import { ApiResponse } from '../../lib/apiResponse';
import { DocumentParentType } from '../../models/document';
import { v4 as uuidv4 } from 'uuid';
import { canDestroy, canWrite, resolveActor } from '../../lib/auth';
import { PLAN_LIMITS, DOCUMENT_COUNT_ABUSE_GUARD } from '../../lib/planLimits';
import { Plan } from '../../models/account';

function getDocumentId(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/documents\/([^/]+)/);
  return match ? match[1] : null;
}

async function verifyParentOwnership(parentType: DocumentParentType, parentId: string, userId: string): Promise<boolean> {
  if (parentType === 'BUILDING') {
    const building = await BuildingRepository.findById(parentId);
    return !!building && building.ownerId === userId && !building.deletedAt;
  }
  const tenant = await TenantRepository.findById(parentId);
  return !!tenant && tenant.ownerId === userId && !tenant.deletedAt;
}

export class DocumentHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;
    const actor = await resolveActor(event);
    if (!actor) return ApiResponse.unauthorized('Not authenticated');
    const userId = actor.accountId;

    try {
      if (method === 'POST' && path.match(/\/api\/documents\/upload-url$/)) {
        if (!canWrite(actor)) return ApiResponse.forbidden('You do not have permission to upload documents');
        return await DocumentHandler.getUploadUrl(event, userId);
      } else if (method === 'GET' && path.match(/\/api\/documents\/[^/]+\/view-url$/)) {
        return await DocumentHandler.getViewUrl(event, userId);
      } else if (method === 'PUT' && path.match(/\/api\/documents\/[^/]+$/)) {
        if (!canWrite(actor)) return ApiResponse.forbidden('You do not have permission to edit documents');
        return await DocumentHandler.updateDocument(event, userId);
      } else if (method === 'DELETE' && path.match(/\/api\/documents\/[^/]+$/)) {
        if (!canDestroy(actor)) return ApiResponse.forbidden('You do not have permission to delete documents');
        return await DocumentHandler.deleteDocument(event, userId);
      } else if (method === 'GET' && path.endsWith('/api/documents')) {
        return await DocumentHandler.listDocuments(event, userId);
      } else if (method === 'POST' && path.endsWith('/api/documents')) {
        if (!canWrite(actor)) return ApiResponse.forbidden('You do not have permission to create documents');
        return await DocumentHandler.createDocument(event, userId, actor.plan);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('DocumentHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async getUploadUrl(event: APIGatewayProxyEvent, userId: string) {
    const body = JSON.parse(event.body || '{}');
    const { parentType, parentId, fileName, contentType } = body as {
      parentType: DocumentParentType; parentId: string; fileName: string; contentType: string;
    };

    if (!parentType || !parentId || !fileName || !contentType) {
      return ApiResponse.error('parentType, parentId, fileName and contentType are required');
    }

    const owns = await verifyParentOwnership(parentType, parentId, userId);
    if (!owns) return ApiResponse.notFound('Parent not found');

    const s3Service = new S3Service();
    try {
      s3Service.validateDocumentFile(fileName, contentType, 0); // size unknown until confirm step
    } catch (err: any) {
      return ApiResponse.error(err.message);
    }

    const folderPrefix = parentType === 'BUILDING'
      ? `buildings/${parentId}/documents`
      : `tenants/${parentId}/documents`;
    const { url, key } = await s3Service.getPresignedUploadUrl(fileName, contentType, undefined, folderPrefix);

    return ApiResponse.success({ documentId: uuidv4(), uploadUrl: url, key });
  }

  static async createDocument(event: APIGatewayProxyEvent, userId: string, plan: Plan) {
    const body = JSON.parse(event.body || '{}');
    const { id, parentType, parentId, contractId, category, fileName, s3Key, mimeType, fileSize, expiryDate, notes } = body;

    if (!id || !parentType || !parentId || !category || !fileName || !s3Key || !mimeType || !fileSize) {
      return ApiResponse.error('Missing required fields');
    }

    const owns = await verifyParentOwnership(parentType, parentId, userId);
    if (!owns) return ApiResponse.notFound('Parent not found');

    const existing = await DocumentRepository.listByOwner(userId);

    // Flat anti-abuse guardrail, independent of plan — blocks someone uploading thousands
    // of tiny files to stay under the byte cap while still consuming disproportionate resources.
    if (existing.length >= DOCUMENT_COUNT_ABUSE_GUARD) {
      return ApiResponse.forbidden('Too many documents on this account. Please delete unused documents or contact support.');
    }

    // docs/Pricing-Strategy-Plan.md — capped by cumulative document size, not count.
    // Document.fileSize is already tracked on every record, so this sums real usage
    // against the plan's byte budget instead of an arbitrary file count.
    const maxDocumentBytes = PLAN_LIMITS[plan].maxDocumentBytes;
    if (maxDocumentBytes !== Infinity) {
      const usedBytes = existing.reduce((sum, d) => sum + d.fileSize, 0);
      if (usedBytes + fileSize > maxDocumentBytes) {
        return ApiResponse.forbidden("You've reached your plan's document storage limit. Upgrade to add more.");
      }
    }

    const s3Service = new S3Service();
    try {
      s3Service.validateDocumentFile(fileName, mimeType, fileSize);
    } catch (err: any) {
      return ApiResponse.error(err.message);
    }

    const document = await DocumentRepository.create({
      id, ownerId: userId, parentType, parentId, contractId, category, fileName, s3Key, mimeType, fileSize, expiryDate, notes,
    });
    return ApiResponse.success({ document }, 201);
  }

  static async listDocuments(event: APIGatewayProxyEvent, userId: string) {
    const parentType = event.queryStringParameters?.parentType as DocumentParentType | undefined;
    const parentId = event.queryStringParameters?.parentId;
    if (!parentType || !parentId) return ApiResponse.error('parentType and parentId are required');

    const owns = await verifyParentOwnership(parentType, parentId, userId);
    if (!owns) return ApiResponse.notFound('Parent not found');

    const documents = await DocumentRepository.listByParent(userId, parentType, parentId);
    return ApiResponse.success({ documents });
  }

  static async getViewUrl(event: APIGatewayProxyEvent, userId: string) {
    const id = getDocumentId(event);
    if (!id) return ApiResponse.notFound('Document not found');
    const document = await DocumentRepository.findById(id);
    if (!document || document.ownerId !== userId || document.deletedAt) return ApiResponse.notFound('Document not found');

    const s3Service = new S3Service();
    const { url } = await s3Service.getPresignedViewUrl(document.s3Key, 3600, document.fileName);
    return ApiResponse.success({ url });
  }

  static async updateDocument(event: APIGatewayProxyEvent, userId: string) {
    const id = getDocumentId(event);
    if (!id) return ApiResponse.notFound('Document not found');
    const document = await DocumentRepository.findById(id);
    if (!document || document.ownerId !== userId || document.deletedAt) return ApiResponse.notFound('Document not found');

    const body = JSON.parse(event.body || '{}');
    const { category, notes, expiryDate, fileName, contractId } = body;
    const updated = await DocumentRepository.update(id, { category, notes, expiryDate, fileName, contractId });
    return ApiResponse.success({ document: updated });
  }

  static async deleteDocument(event: APIGatewayProxyEvent, userId: string) {
    const id = getDocumentId(event);
    if (!id) return ApiResponse.notFound('Document not found');
    const document = await DocumentRepository.findById(id);
    if (!document || document.ownerId !== userId || document.deletedAt) return ApiResponse.notFound('Document not found');

    await DocumentRepository.delete(id);

    // The DynamoDB record is soft-deleted (kept for audit trail, same as everywhere else in
    // this repo), but the S3 object itself must actually be removed — otherwise the real
    // storage cost never goes away even though it's excluded from the account's byte quota
    // the moment deletedAt is set. Mirrors PropertyHandler.deleteProperty's S3 cleanup.
    try {
      await new S3Service().deleteObject(document.s3Key);
    } catch (err) {
      console.error(`Failed to delete S3 object for document ${id}:`, err);
      // Don't fail the request over this — the document is already gone from the user's
      // perspective and out of their quota; a leaked S3 object is a cleanup concern, not
      // something that should block them.
    }

    return ApiResponse.success({ message: 'Deleted' });
  }
}
