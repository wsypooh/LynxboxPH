import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TenantRepository } from '../../repositories/tenantRepository';
import { InvoiceRepository } from '../../repositories/invoiceRepository';
import { ApiResponse } from '../../lib/apiResponse';

function getUserId(event: APIGatewayProxyEvent): string | null {
  return event.requestContext.authorizer?.claims?.sub
    || event.requestContext.authorizer?.claims?.['cognito:username']
    || (process.env.IS_OFFLINE ? 'local-test-user-123' : null);
}

function getTenantId(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/tenants\/([^/]+)/);
  return match ? match[1] : null;
}

export class TenantHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;
    const userId = getUserId(event);
    if (!userId) return ApiResponse.unauthorized('Not authenticated');

    try {
      if (method === 'GET' && path.match(/\/api\/tenants\/[^/]+\/invoices$/)) {
        return await TenantHandler.listTenantInvoices(event, userId);
      } else if (method === 'GET' && path.match(/\/api\/tenants\/[^/]+$/)) {
        return await TenantHandler.getTenant(event, userId);
      } else if (method === 'PUT' && path.match(/\/api\/tenants\/[^/]+$/)) {
        const action = event.queryStringParameters?.action;
        if (action === 'renew') return await TenantHandler.renewContract(event, userId);
        return await TenantHandler.updateTenant(event, userId);
      } else if (method === 'DELETE' && path.match(/\/api\/tenants\/[^/]+$/)) {
        return await TenantHandler.deleteTenant(event, userId);
      } else if (method === 'GET' && path.endsWith('/api/tenants')) {
        return await TenantHandler.listTenants(event, userId);
      } else if (method === 'POST' && path.endsWith('/api/tenants')) {
        return await TenantHandler.createTenant(event, userId);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('TenantHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async listTenants(event: APIGatewayProxyEvent, userId: string) {
    const buildingId = event.queryStringParameters?.buildingId;
    let tenants;
    if (buildingId) {
      tenants = await TenantRepository.listByBuilding(userId, buildingId);
    } else {
      tenants = await TenantRepository.listByOwner(userId);
    }
    return ApiResponse.success({ tenants });
  }

  static async createTenant(event: APIGatewayProxyEvent, userId: string) {
    const body = JSON.parse(event.body || '{}');
    const tenant = await TenantRepository.create({ ...body, ownerId: userId });
    return ApiResponse.success({ tenant }, 201);
  }

  static async getTenant(event: APIGatewayProxyEvent, userId: string) {
    const id = getTenantId(event);
    if (!id) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(id);
    if (!tenant || tenant.ownerId !== userId || tenant.deletedAt) return ApiResponse.notFound('Tenant not found');
    return ApiResponse.success({ tenant });
  }

  static async updateTenant(event: APIGatewayProxyEvent, userId: string) {
    const id = getTenantId(event);
    if (!id) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(id);
    if (!tenant || tenant.ownerId !== userId || tenant.deletedAt) return ApiResponse.notFound('Tenant not found');
    const body = JSON.parse(event.body || '{}');
    const updated = await TenantRepository.update(id, body);
    return ApiResponse.success({ tenant: updated });
  }

  static async renewContract(event: APIGatewayProxyEvent, userId: string) {
    const id = getTenantId(event);
    if (!id) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(id);
    if (!tenant || tenant.ownerId !== userId) return ApiResponse.notFound('Tenant not found');
    const body = JSON.parse(event.body || '{}');
    const updated = await TenantRepository.addContract(id, body);
    return ApiResponse.success({ tenant: updated });
  }

  static async deleteTenant(event: APIGatewayProxyEvent, userId: string) {
    const id = getTenantId(event);
    if (!id) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(id);
    if (!tenant || tenant.ownerId !== userId || tenant.deletedAt) return ApiResponse.notFound('Tenant not found');
    await TenantRepository.delete(id);
    return ApiResponse.success({ message: 'Deleted' });
  }

  static async listTenantInvoices(event: APIGatewayProxyEvent, userId: string) {
    const id = getTenantId(event);
    if (!id) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(id);
    if (!tenant || tenant.ownerId !== userId) return ApiResponse.notFound('Tenant not found');
    const invoices = await InvoiceRepository.listByTenant(id);
    return ApiResponse.success({ invoices });
  }
}
