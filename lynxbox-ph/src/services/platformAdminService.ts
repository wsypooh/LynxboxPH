import { getAuthHeaders } from '@/lib/auth';
import { parseApiError } from '@/lib/apiError';
import { PlatformSummary, AccountDetail, Plan } from '@/features/platform-admin/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

class PlatformAdminService {
  private async request<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const authHeaders = await getAuthHeaders();

    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }

    const json = await response.json();
    return (json.data ?? json) as T;
  }

  async getDashboardSummary(): Promise<PlatformSummary> {
    return this.request<PlatformSummary>('/api/platform-admin/dashboard/summary');
  }

  async getAccountDetail(accountId: string): Promise<AccountDetail> {
    return this.request<AccountDetail>(`/api/platform-admin/accounts/${accountId}`);
  }

  async updateAccountPlan(accountId: string, plan: Plan): Promise<{ accountId: string; plan: Plan }> {
    return this.request<{ accountId: string; plan: Plan }>(`/api/platform-admin/accounts/${accountId}/plan`, {
      method: 'PUT',
      body: JSON.stringify({ plan }),
    });
  }
}

export const platformAdminService = new PlatformAdminService();
