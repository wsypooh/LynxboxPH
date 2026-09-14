import { getAuthHeaders } from '@/lib/auth';
import { Invoice, InvoiceInput, Payment } from '@/features/invoicing/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

class InvoiceService {
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

  async listInvoices(filters?: { tenantId?: string; billingMonth?: string; status?: string }): Promise<Invoice[]> {
    const qs = filters ? new URLSearchParams(filters as Record<string, string>).toString() : '';
    const res = await this.request<{ invoices: Invoice[] }>(`/api/invoices${qs ? '?' + qs : ''}`);
    return res.invoices ?? [];
  }

  async createInvoice(data: Partial<InvoiceInput>): Promise<Invoice> {
    const res = await this.request<{ invoice: Invoice }>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.invoice;
  }

  async getInvoice(id: string): Promise<Invoice> {
    const res = await this.request<{ invoice: Invoice }>(`/api/invoices/${id}`);
    return res.invoice;
  }

  async updateInvoice(id: string, data: Partial<InvoiceInput>): Promise<Invoice> {
    const res = await this.request<{ invoice: Invoice }>(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.invoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.request(`/api/invoices/${id}`, { method: 'DELETE' });
  }

  async markAsPrinted(id: string): Promise<Invoice> {
    const res = await this.request<{ invoice: Invoice }>(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'printed' }),
    });
    return res.invoice;
  }

  async revertToDraft(id: string): Promise<Invoice> {
    const res = await this.request<{ invoice: Invoice }>(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'draft' }),
    });
    return res.invoice;
  }

  async recordPayment(id: string, payment: Payment): Promise<Invoice> {
    const res = await this.request<{ invoice: Invoice }>(`/api/invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
    return res.invoice;
  }

  async sendInvoice(id: string): Promise<Invoice> {
    const res = await this.request<{ invoice: Invoice }>(`/api/invoices/${id}/send`, {
      method: 'POST',
    });
    return res.invoice;
  }

  async rolloverInvoice(id: string): Promise<Partial<InvoiceInput>> {
    const res = await this.request<{ draft: Partial<InvoiceInput> }>(`/api/invoices/${id}/rollover`, {
      method: 'POST',
    });
    return res.draft;
  }

  async downloadPdf(id: string, invoiceNumber: string, tenantCode?: string): Promise<void> {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}/pdf`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });
    if (!response.ok) throw new Error('Failed to download PDF');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tenantCode ? `${tenantCode}-${invoiceNumber}.pdf` : `${invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async downloadBatchPdf(billingMonth: string): Promise<void> {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/invoices/batch-pdf?billingMonth=${billingMonth}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders },
    });
    if (!response.ok) throw new Error('Failed to download batch PDF');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${billingMonth}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async downloadSelectedPdf(ids: string[]): Promise<void> {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/invoices/batch-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Failed to download selected PDFs');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices-selected.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const invoiceService = new InvoiceService();
