import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BuildingRepository } from '../../repositories/buildingRepository';
import { TenantRepository } from '../../repositories/tenantRepository';
import { ApiResponse } from '../../lib/apiResponse';
import { Actor, canDestroy, canWrite, resolveActor } from '../../lib/auth';

function getBuildingId(event: APIGatewayProxyEvent): string | null {
  const path = event.path;
  const match = path.match(/\/api\/buildings\/([^/]+)/);
  return match ? match[1] : null;
}

export class BuildingHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;
    const actor = await resolveActor(event);
    if (!actor) return ApiResponse.unauthorized('Not authenticated');

    try {
      if (method === 'GET' && path.match(/\/api\/buildings\/[^/]+\/tenants$/)) {
        return await BuildingHandler.listTenantsByBuilding(event, actor);
      } else if (method === 'GET' && path.match(/\/api\/buildings\/[^/]+$/)) {
        return await BuildingHandler.getBuilding(event, actor);
      } else if (method === 'PUT' && path.match(/\/api\/buildings\/[^/]+$/)) {
        if (!canWrite(actor)) return ApiResponse.forbidden('You do not have permission to edit buildings');
        return await BuildingHandler.updateBuilding(event, actor);
      } else if (method === 'DELETE' && path.match(/\/api\/buildings\/[^/]+$/)) {
        if (!canDestroy(actor)) return ApiResponse.forbidden('You do not have permission to delete buildings');
        return await BuildingHandler.deleteBuilding(event, actor);
      } else if (method === 'GET' && path.endsWith('/api/buildings')) {
        return await BuildingHandler.listBuildings(event, actor);
      } else if (method === 'POST' && path.endsWith('/api/buildings')) {
        if (!canWrite(actor)) return ApiResponse.forbidden('You do not have permission to create buildings');
        return await BuildingHandler.createBuilding(event, actor);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('BuildingHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async listBuildings(event: APIGatewayProxyEvent, actor: Actor) {
    const buildings = await BuildingRepository.listByOwner(actor.accountId);
    return ApiResponse.success({ buildings });
  }

  static async createBuilding(event: APIGatewayProxyEvent, actor: Actor) {
    const body = JSON.parse(event.body || '{}');
    const building = await BuildingRepository.create({ ...body, ownerId: actor.accountId });
    return ApiResponse.success({ building }, 201);
  }

  static async getBuilding(event: APIGatewayProxyEvent, actor: Actor) {
    const id = getBuildingId(event);
    if (!id) return ApiResponse.notFound('Building not found');
    const building = await BuildingRepository.findById(id);
    if (!building || building.ownerId !== actor.accountId || building.deletedAt) return ApiResponse.notFound('Building not found');
    return ApiResponse.success({ building });
  }

  static async updateBuilding(event: APIGatewayProxyEvent, actor: Actor) {
    const id = getBuildingId(event);
    if (!id) return ApiResponse.notFound('Building not found');
    const building = await BuildingRepository.findById(id);
    if (!building || building.ownerId !== actor.accountId || building.deletedAt) return ApiResponse.notFound('Building not found');
    const body = JSON.parse(event.body || '{}');
    const updated = await BuildingRepository.update(id, body);
    return ApiResponse.success({ building: updated });
  }

  static async deleteBuilding(event: APIGatewayProxyEvent, actor: Actor) {
    const id = getBuildingId(event);
    if (!id) return ApiResponse.notFound('Building not found');
    const building = await BuildingRepository.findById(id);
    if (!building || building.ownerId !== actor.accountId || building.deletedAt) return ApiResponse.notFound('Building not found');
    await BuildingRepository.delete(id);
    return ApiResponse.success({ message: 'Deleted' });
  }

  static async listTenantsByBuilding(event: APIGatewayProxyEvent, actor: Actor) {
    const id = getBuildingId(event);
    if (!id) return ApiResponse.notFound('Building not found');
    const tenants = await TenantRepository.listByBuilding(actor.accountId, id);
    return ApiResponse.success({ tenants });
  }
}
