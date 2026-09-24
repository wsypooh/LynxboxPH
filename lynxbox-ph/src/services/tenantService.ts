import { getAuthHeaders } from '@/lib/auth';
import { parseApiError } from '@/lib/apiError';
import {
  Tenant, TenantInput, TenantContract, Invoice,
  LedgerSummary, PaymentLedgerEntry, ChargeEntry, LedgerChargeInput,
} from '@/features/invoicing/types';

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
      throw await parseApiError(response);
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

  async getLedger(id: string, asOf?: string): Promise<LedgerSummary> {
    const qs = asOf ? `?asOf=${asOf}` : '';
    return this.request<LedgerSummary>(`/api/tenants/${id}/ledger${qs}`);
  }

  async recordLedgerPayment(
    id: string,
    data: { amount: number; date: string; paymentMethod: string; note?: string }
  ): Promise<PaymentLedgerEntry> {
    const res = await this.request<{ paymentEntry: PaymentLedgerEntry }>(`/api/tenants/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.paymentEntry;
  }

  async createLedgerCharge(data: LedgerChargeInput): Promise<ChargeEntry> {
    const res = await this.request<{ chargeEntry: ChargeEntry }>('/api/ledger/charges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.chargeEntry;
  }

  async resetLedger(id: string): Promise<{ chargesCleared: number; paymentsCleared: number }> {
    return this.request<{ chargesCleared: number; paymentsCleared: number }>(`/api/tenants/${id}/ledger/reset`, {
      method: 'POST',
    });
  }
}

export const tenantService = new TenantService();
