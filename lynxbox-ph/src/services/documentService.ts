import { getAuthHeaders } from '@/lib/auth';
import { parseApiError } from '@/lib/apiError';
import { Document, DocumentCategory, DocumentParentType } from '@/features/documents/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

export interface ConfirmUploadPayload {
  id: string;
  parentType: DocumentParentType;
  parentId: string;
  contractId?: string;
  category: DocumentCategory;
  fileName: string;
  s3Key: string;
  mimeType: string;
  fileSize: number;
  expiryDate?: string;
  notes?: string;
}

export interface UpdateDocumentPayload {
  category?: DocumentCategory;
  notes?: string;
  expiryDate?: string;
  fileName?: string;
  contractId?: string;
}

class DocumentService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const authHeaders = await getAuthHeaders();

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

  async getUploadUrl(
    parentType: DocumentParentType,
    parentId: string,
    fileName: string,
    contentType: string
  ): Promise<{ documentId: string; uploadUrl: string; key: string }> {
    return this.request<{ documentId: string; uploadUrl: string; key: string }>('/api/documents/upload-url', {
      method: 'POST',
      body: JSON.stringify({ parentType, parentId, fileName, contentType }),
    });
  }

  async uploadFile(uploadUrl: string, file: File, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            onProgress((event.loaded / event.total) * 100);
          }
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

  async confirmUpload(payload: ConfirmUploadPayload): Promise<Document> {
    const res = await this.request<{ document: Document }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.document;
  }

  async listDocuments(parentType: DocumentParentType, parentId: string): Promise<Document[]> {
    const res = await this.request<{ documents: Document[] }>(
      `/api/documents?parentType=${parentType}&parentId=${parentId}`
    );
    return res.documents ?? [];
  }

  async getViewUrl(id: string): Promise<string> {
    const res = await this.request<{ url: string }>(`/api/documents/${id}/view-url`);
    return res.url;
  }

  async updateDocument(id: string, data: UpdateDocumentPayload): Promise<Document> {
    const res = await this.request<{ document: Document }>(`/api/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.document;
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request(`/api/documents/${id}`, { method: 'DELETE' });
  }
}

export const documentService = new DocumentService();
