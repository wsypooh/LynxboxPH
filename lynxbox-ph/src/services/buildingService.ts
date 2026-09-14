import { getAuthHeaders } from '@/lib/auth';
import { Building, BuildingInput, Tenant } from '@/features/invoicing/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

class BuildingService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const authHeaders = requireAuth ? await getAuthHeaders() : {};

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const json = await response.json();
    return (json.data ?? json) as T;
  }

  async listBuildings(): Promise<Building[]> {
    const res = await this.request<{ buildings: Building[] }>('/api/buildings');
    return res.buildings ?? [];
  }

  async createBuilding(data: BuildingInput): Promise<Building> {
    const res = await this.request<{ building: Building }>('/api/buildings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.building;
  }

  async getBuilding(id: string): Promise<Building> {
    const res = await this.request<{ building: Building }>(`/api/buildings/${id}`);
    return res.building;
  }

  async updateBuilding(id: string, data: Partial<BuildingInput>): Promise<Building> {
    const res = await this.request<{ building: Building }>(`/api/buildings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.building;
  }

  async deleteBuilding(id: string): Promise<void> {
    await this.request(`/api/buildings/${id}`, { method: 'DELETE' });
  }

  async listTenantsByBuilding(buildingId: string): Promise<Tenant[]> {
    const res = await this.request<{ tenants: Tenant[] }>(`/api/buildings/${buildingId}/tenants`);
    return res.tenants ?? [];
  }
}

export const buildingService = new BuildingService();
