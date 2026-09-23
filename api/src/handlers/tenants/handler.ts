import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TenantRepository } from '../../repositories/tenantRepository';
import { InvoiceRepository } from '../../repositories/invoiceRepository';
import { ApiResponse } from '../../lib/apiResponse';
import { Actor, canDestroy, canWrite, resolveActor } from '../../lib/auth';

function getTenantId(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/tenants\/([^/]+)/);
  return match ? match[1] : null;
}

export class TenantHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;
    const actor = await resolveActor(event);
    if (!actor) return ApiResponse.unauthorized('Not authenticated');

    try {
      if (method === 'GET' && path.match(/\/api\/tenants\/[^/]+\/invoices$/)) {
        return await TenantHandler.listTenantInvoices(event, actor);
      } else if (method === 'GET' && path.match(/\/api\/tenants\/[^/]+$/)) {
        return await TenantHandler.getTenant(event, actor);
      } else if (method === 'PUT' && path.match(/\/api\/tenants\/[^/]+$/)) {
        if (!canWrite(actor)) return ApiResponse.forbidden('You do not have permission to edit tenants');
        const action = event.queryStringParameters?.action;
        if (action === 'renew') return await TenantHandler.renewContract(event, actor);
        return await TenantHandler.updateTenant(event, actor);
      } else if (method === 'DELETE' && path.match(/\/api\/tenants\/[^/]+$/)) {
        if (!canDestroy(actor)) return ApiResponse.forbidden('You do not have permission to delete tenants');
        return await TenantHandler.deleteTenant(event, actor);
      } else if (method === 'GET' && path.endsWith('/api/tenants')) {
        return await TenantHandler.listTenants(event, actor);
      } else if (method === 'POST' && path.endsWith('/api/tenants')) {
        if (!canWrite(actor)) return ApiResponse.forbidden('You do not have permission to create tenants');
        return await TenantHandler.createTenant(event, actor);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('TenantHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async listTenants(event: APIGatewayProxyEvent, actor: Actor) {
    const buildingId = event.queryStringParameters?.buildingId;
    let tenants;
    if (buildingId) {
      tenants = await TenantRepository.listByBuilding(actor.accountId, buildingId);
    } else {
      tenants = await TenantRepository.listByOwner(actor.accountId);
    }
    return ApiResponse.success({ tenants });
  }

  static async createTenant(event: APIGatewayProxyEvent, actor: Actor) {
    const body = JSON.parse(event.body || '{}');
    const tenant = await TenantRepository.create({ ...body, ownerId: actor.accountId });
    return ApiResponse.success({ tenant }, 201);
  }

  static async getTenant(event: APIGatewayProxyEvent, actor: Actor) {
    const id = getTenantId(event);
    if (!id) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(id);
    if (!tenant || tenant.ownerId !== actor.accountId || tenant.deletedAt) return ApiResponse.notFound('Tenant not found');
    return ApiResponse.success({ tenant });
  }

  static async updateTenant(event: APIGatewayProxyEvent, actor: Actor) {
    const id = getTenantId(event);
    if (!id) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(id);
    if (!tenant || tenant.ownerId !== actor.accountId || tenant.deletedAt) return ApiResponse.notFound('Tenant not found');
    const body = JSON.parse(event.body || '{}');
    const updated = await TenantRepository.update(id, body);
    return ApiResponse.success({ tenant: updated });
  }

  static async renewContract(event: APIGatewayProxyEvent, actor: Actor) {
    const id = getTenantId(event);
    if (!id) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(id);
    if (!tenant || tenant.ownerId !== actor.accountId) return ApiResponse.notFound('Tenant not found');
    const body = JSON.parse(event.body || '{}');
    const updated = await TenantRepository.addContract(id, body);
    return ApiResponse.success({ tenant: updated });
  }

  static async deleteTenant(event: APIGatewayProxyEvent, actor: Actor) {
    const id = getTenantId(event);
    if (!id) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(id);
    if (!tenant || tenant.ownerId !== actor.accountId || tenant.deletedAt) return ApiResponse.notFound('Tenant not found');
    await TenantRepository.delete(id);
    return ApiResponse.success({ message: 'Deleted' });
  }

  static async listTenantInvoices(event: APIGatewayProxyEvent, actor: Actor) {
    const id = getTenantId(event);
    if (!id) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(id);
    if (!tenant || tenant.ownerId !== actor.accountId) return ApiResponse.notFound('Tenant not found');
    const invoices = await InvoiceRepository.listByTenant(id);
    return ApiResponse.success({ invoices });
  }
}
