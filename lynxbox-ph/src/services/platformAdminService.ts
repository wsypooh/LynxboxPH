import { getAuthHeaders } from '@/lib/auth';
import { PlatformSummary, AccountDetail } from '@/features/platform-admin/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

class PlatformAdminService {
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const authHeaders = await getAuthHeaders();

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
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
}

export const platformAdminService = new PlatformAdminService();
