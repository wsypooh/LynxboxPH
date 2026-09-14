import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BuildingRepository } from '../../repositories/buildingRepository';
import { TenantRepository } from '../../repositories/tenantRepository';
import { ApiResponse } from '../../lib/apiResponse';

function getUserId(event: APIGatewayProxyEvent): string | null {
  return event.requestContext.authorizer?.claims?.sub
    || event.requestContext.authorizer?.claims?.['cognito:username']
    || (process.env.IS_OFFLINE ? 'local-test-user-123' : null);
}

function getBuildingId(event: APIGatewayProxyEvent): string | null {
  const path = event.path;
  const match = path.match(/\/api\/buildings\/([^/]+)/);
  return match ? match[1] : null;
}

export class BuildingHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;
    const userId = getUserId(event);
    if (!userId) return ApiResponse.unauthorized('Not authenticated');

    try {
      if (method === 'GET' && path.match(/\/api\/buildings\/[^/]+\/tenants$/)) {
        return await BuildingHandler.listTenantsByBuilding(event, userId);
      } else if (method === 'GET' && path.match(/\/api\/buildings\/[^/]+$/)) {
        return await BuildingHandler.getBuilding(event, userId);
      } else if (method === 'PUT' && path.match(/\/api\/buildings\/[^/]+$/)) {
        return await BuildingHandler.updateBuilding(event, userId);
      } else if (method === 'DELETE' && path.match(/\/api\/buildings\/[^/]+$/)) {
        return await BuildingHandler.deleteBuilding(event, userId);
      } else if (method === 'GET' && path.endsWith('/api/buildings')) {
        return await BuildingHandler.listBuildings(event, userId);
      } else if (method === 'POST' && path.endsWith('/api/buildings')) {
        return await BuildingHandler.createBuilding(event, userId);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('BuildingHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async listBuildings(event: APIGatewayProxyEvent, userId: string) {
    const buildings = await BuildingRepository.listByOwner(userId);
    return ApiResponse.success({ buildings });
  }

  static async createBuilding(event: APIGatewayProxyEvent, userId: string) {
    const body = JSON.parse(event.body || '{}');
    const building = await BuildingRepository.create({ ...body, ownerId: userId });
    return ApiResponse.success({ building }, 201);
  }

  static async getBuilding(event: APIGatewayProxyEvent, userId: string) {
    const id = getBuildingId(event);
    if (!id) return ApiResponse.notFound('Building not found');
    const building = await BuildingRepository.findById(id);
    if (!building || building.ownerId !== userId || building.deletedAt) return ApiResponse.notFound('Building not found');
    return ApiResponse.success({ building });
  }

  static async updateBuilding(event: APIGatewayProxyEvent, userId: string) {
    const id = getBuildingId(event);
    if (!id) return ApiResponse.notFound('Building not found');
    const building = await BuildingRepository.findById(id);
    if (!building || building.ownerId !== userId || building.deletedAt) return ApiResponse.notFound('Building not found');
    const body = JSON.parse(event.body || '{}');
    const updated = await BuildingRepository.update(id, body);
    return ApiResponse.success({ building: updated });
  }

  static async deleteBuilding(event: APIGatewayProxyEvent, userId: string) {
    const id = getBuildingId(event);
    if (!id) return ApiResponse.notFound('Building not found');
    const building = await BuildingRepository.findById(id);
    if (!building || building.ownerId !== userId || building.deletedAt) return ApiResponse.notFound('Building not found');
    await BuildingRepository.delete(id);
    return ApiResponse.success({ message: 'Deleted' });
  }

  static async listTenantsByBuilding(event: APIGatewayProxyEvent, userId: string) {
    const id = getBuildingId(event);
    if (!id) return ApiResponse.notFound('Building not found');
    const tenants = await TenantRepository.listByBuilding(userId, id);
    return ApiResponse.success({ tenants });
  }
}
