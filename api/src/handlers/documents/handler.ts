import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DocumentRepository } from '../../repositories/documentRepository';
import { BuildingRepository } from '../../repositories/buildingRepository';
import { TenantRepository } from '../../repositories/tenantRepository';
import { S3Service } from '../../lib/s3';
import { ApiResponse } from '../../lib/apiResponse';
import { DocumentParentType } from '../../models/document';
import { v4 as uuidv4 } from 'uuid';

function getUserId(event: APIGatewayProxyEvent): string | null {
  return event.requestContext.authorizer?.claims?.sub
    || event.requestContext.authorizer?.claims?.['cognito:username']
    || (process.env.IS_OFFLINE ? 'local-test-user-123' : null);
}

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
    const userId = getUserId(event);
    if (!userId) return ApiResponse.unauthorized('Not authenticated');

    try {
      if (method === 'POST' && path.match(/\/api\/documents\/upload-url$/)) {
        return await DocumentHandler.getUploadUrl(event, userId);
      } else if (method === 'GET' && path.match(/\/api\/documents\/[^/]+\/view-url$/)) {
        return await DocumentHandler.getViewUrl(event, userId);
      } else if (method === 'PUT' && path.match(/\/api\/documents\/[^/]+$/)) {
        return await DocumentHandler.updateDocument(event, userId);
      } else if (method === 'DELETE' && path.match(/\/api\/documents\/[^/]+$/)) {
        return await DocumentHandler.deleteDocument(event, userId);
      } else if (method === 'GET' && path.endsWith('/api/documents')) {
        return await DocumentHandler.listDocuments(event, userId);
      } else if (method === 'POST' && path.endsWith('/api/documents')) {
        return await DocumentHandler.createDocument(event, userId);
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

  static async createDocument(event: APIGatewayProxyEvent, userId: string) {
    const body = JSON.parse(event.body || '{}');
    const { id, parentType, parentId, contractId, category, fileName, s3Key, mimeType, fileSize, expiryDate, notes } = body;

    if (!id || !parentType || !parentId || !category || !fileName || !s3Key || !mimeType || !fileSize) {
      return ApiResponse.error('Missing required fields');
    }

    const owns = await verifyParentOwnership(parentType, parentId, userId);
    if (!owns) return ApiResponse.notFound('Parent not found');

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
    return ApiResponse.success({ message: 'Deleted' });
  }
}
