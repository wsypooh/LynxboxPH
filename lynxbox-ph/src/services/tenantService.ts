import { getAuthHeaders } from '@/lib/auth';
import { Tenant, TenantInput, TenantContract, Invoice } from '@/features/invoicing/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

class TenantService {
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

  async listTenants(buildingId?: string): Promise<Tenant[]> {
    const qs = buildingId ? `?buildingId=${buildingId}` : '';
    const res = await this.request<{ tenants: Tenant[] }>(`/api/tenants${qs}`);
    return res.tenants ?? [];
  }

  async createTenant(data: TenantInput): Promise<Tenant> {
    const res = await this.request<{ tenant: Tenant }>('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.tenant;
  }

  async getTenant(id: string): Promise<Tenant> {
    const res = await this.request<{ tenant: Tenant }>(`/api/tenants/${id}`);
    return res.tenant;
  }

  async updateTenant(id: string, data: Partial<TenantInput>): Promise<Tenant> {
    const res = await this.request<{ tenant: Tenant }>(`/api/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.tenant;
  }

  async renewContract(id: string, contract: TenantContract): Promise<Tenant> {
    const res = await this.request<{ tenant: Tenant }>(`/api/tenants/${id}?action=renew`, {
      method: 'PUT',
      body: JSON.stringify(contract),
    });
    return res.tenant;
  }

  async deleteTenant(id: string): Promise<void> {
    await this.request(`/api/tenants/${id}`, { method: 'DELETE' });
  }

  async listInvoicesByTenant(id: string): Promise<Invoice[]> {
    const res = await this.request<{ invoices: Invoice[] }>(`/api/invoices?tenantId=${id}`);
    return res.invoices ?? [];
  }
}

export const tenantService = new TenantService();
