import { getAuthHeaders } from '@/lib/auth';
import { AccountContext, AccountMember, InviteMemberInput, Membership, Role } from '@/features/account/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

class AccountService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const authHeaders = await getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    return (json.data ?? json) as T;
  }

  async getMe(): Promise<AccountContext> {
    return this.request<AccountContext>('/api/account/me');
  }

  async listMemberships(): Promise<Membership[]> {
    const res = await this.request<{ memberships: Membership[] }>('/api/account/memberships');
    return res.memberships ?? [];
  }

  async listMembers(): Promise<AccountMember[]> {
    const res = await this.request<{ members: AccountMember[] }>('/api/account/members');
    return res.members ?? [];
  }

  async inviteMember(data: InviteMemberInput): Promise<AccountMember> {
    const res = await this.request<{ member: AccountMember }>('/api/account/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.member;
  }

  async updateMemberRole(sub: string, role: Role): Promise<AccountMember> {
    const res = await this.request<{ member: AccountMember }>(`/api/account/members/${encodeURIComponent(sub)}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    return res.member;
  }

  async removeMember(sub: string): Promise<void> {
    await this.request(`/api/account/members/${encodeURIComponent(sub)}`, { method: 'DELETE' });
  }
}

export const accountService = new AccountService();
