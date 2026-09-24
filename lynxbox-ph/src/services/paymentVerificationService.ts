import { getAuthHeaders } from '@/lib/auth';
import { parseApiError } from '@/lib/apiError';
import { PaymentSubmission, PaymentSubmissionStatus, PromoCode, AccountSubscription, PaidPlan } from '@/features/billing/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

// docs/Payments-and-Subscription-Plan.md — platform-admin's payment verification surface.
// Kept separate from platformAdminService.ts (which owns the pre-existing, narrower
// read-only dashboard + plan-toggle) since this is a different domain (submissions/promo
// codes, not accounts).
class PaymentVerificationService {
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
      throw await parseApiError(response);
    }

    const json = await response.json();
    return (json.data ?? json) as T;
  }

  async listSubmissions(status?: PaymentSubmissionStatus): Promise<PaymentSubmission[]> {
    const query = status ? `?status=${status}` : '';
    const res = await this.request<{ submissions: PaymentSubmission[] }>(`/api/platform-admin/payment-submissions${query}`);
    return res.submissions ?? [];
  }

  async getProofViewUrl(id: string): Promise<string> {
    const res = await this.request<{ url: string }>(`/api/platform-admin/payment-submissions/${id}/view-url`);
    return res.url;
  }

  async approveSubmission(id: string): Promise<AccountSubscription> {
    const res = await this.request<{ account: AccountSubscription }>(`/api/platform-admin/payment-submissions/${id}/approve`, {
      method: 'POST',
    });
    return res.account;
  }

  async rejectSubmission(id: string, reason: string): Promise<void> {
    await this.request(`/api/platform-admin/payment-submissions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // `plan` is required when the account isn't currently trialing (e.g. a lapsed trial
  // that already reverted to Free) — see BillingHandler... AccountRepository.extendTrial
  // for why re-granting one needs to be told the plan again.
  async extendTrial(accountId: string, trialEndsAt: string, notes?: string, plan?: PaidPlan): Promise<AccountSubscription> {
    const res = await this.request<{ account: AccountSubscription }>(`/api/platform-admin/accounts/${accountId}/extend-trial`, {
      method: 'POST',
      body: JSON.stringify({ trialEndsAt, notes, plan }),
    });
    return res.account;
  }

  async listPromoCodes(): Promise<PromoCode[]> {
    const res = await this.request<{ codes: PromoCode[] }>('/api/platform-admin/promo-codes');
    return res.codes ?? [];
  }

  async createPromoCode(data: Omit<PromoCode, 'redemptionCount'>): Promise<PromoCode> {
    const res = await this.request<{ code: PromoCode }>('/api/platform-admin/promo-codes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.code;
  }

  async updatePromoCode(
    code: string,
    data: Partial<Omit<PromoCode, 'code' | 'redemptionCount' | 'maxRedemptions' | 'startsAt' | 'expiresAt'>> & {
      maxRedemptions?: number | null; // null clears the cap — see PromoCodeRepository.update()
      startsAt?: string | null; // null clears the start date
      expiresAt?: string | null; // null clears the expiry
    }
  ): Promise<PromoCode> {
    const res = await this.request<{ code: PromoCode }>(`/api/platform-admin/promo-codes/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.code;
  }

  async deactivatePromoCode(code: string): Promise<PromoCode> {
    const res = await this.request<{ code: PromoCode }>(`/api/platform-admin/promo-codes/${encodeURIComponent(code)}/deactivate`, {
      method: 'PUT',
    });
    return res.code;
  }
}

export const paymentVerificationService = new PaymentVerificationService();
