import { getAuthHeaders } from '@/lib/auth';
import { parseApiError } from '@/lib/apiError';
import {
  AccountSubscription, UsageSummary, PaymentSubmission, CreatePaymentSubmissionPayload,
  PromoCode, AmountDue, PaidPlan, BillingCycle,
} from '@/features/billing/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

class BillingService {
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

  async getStatus(): Promise<AccountSubscription> {
    const res = await this.request<{ account: AccountSubscription }>('/api/billing/status');
    return res.account;
  }

  async getUsage(): Promise<UsageSummary> {
    return this.request<UsageSummary>('/api/billing/usage');
  }

  async startTrial(plan: PaidPlan, billingCycle: BillingCycle): Promise<AccountSubscription> {
    const res = await this.request<{ account: AccountSubscription }>('/api/billing/start-trial', {
      method: 'POST',
      body: JSON.stringify({ plan, billingCycle }),
    });
    return res.account;
  }

  async downgradeToFree(): Promise<AccountSubscription> {
    const res = await this.request<{ account: AccountSubscription }>('/api/billing/downgrade-to-free', {
      method: 'POST',
    });
    return res.account;
  }

  async getUploadUrl(fileName: string, contentType: string): Promise<{ uploadUrl: string; key: string }> {
    return this.request('/api/billing/payment-submissions/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    });
  }

  // Same direct-to-S3 XHR PUT pattern as documentService.uploadFile.
  async uploadFile(uploadUrl: string, file: File, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) resolve();
        else reject(new Error('Upload failed'));
      });
      xhr.addEventListener('error', () => reject(new Error('Upload failed')));

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  async createPaymentSubmission(payload: CreatePaymentSubmissionPayload): Promise<PaymentSubmission> {
    const res = await this.request<{ submission: PaymentSubmission }>('/api/billing/payment-submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.submission;
  }

  async listPaymentSubmissions(): Promise<PaymentSubmission[]> {
    const res = await this.request<{ submissions: PaymentSubmission[] }>('/api/billing/payment-submissions');
    return res.submissions ?? [];
  }

  async getActiveAutoApplyPromo(): Promise<PromoCode | null> {
    const res = await this.request<{ promo: PromoCode | null }>('/api/public/promo-codes/active-auto-apply');
    return res.promo;
  }

  async validatePromoCode(code: string, plan: PaidPlan, cycle: BillingCycle): Promise<{ promo: PromoCode } & AmountDue> {
    // Authenticated (not /api/public/*) so the backend can enforce new-customers-only
    // eligibility against the real caller's account — see BillingHandler.validatePromoCode.
    return this.request(`/api/billing/promo-codes/validate?code=${encodeURIComponent(code)}&plan=${plan}&cycle=${cycle}`);
  }
}

export const billingService = new BillingService();
