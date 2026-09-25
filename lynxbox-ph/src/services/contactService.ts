import { getAuthHeaders } from '@/lib/auth';
import { parseApiError } from '@/lib/apiError';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

export interface ContactFormPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

class ContactService {
  async submit(payload: ContactFormPayload): Promise<void> {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/public/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw await parseApiError(response);
    }
  }
}

export const contactService = new ContactService();
