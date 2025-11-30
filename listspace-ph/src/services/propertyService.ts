export interface PropertyFeatures {
  area: number;
  parking: number;
  floors: number;
  furnished: boolean;
  aircon: boolean;
  wifi: boolean;
  security: boolean;
}

export interface PropertyLocation {
  address: string;
  city: string;
  province: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}

export interface PropertyContactInfo {
  name: string;
  email: string;
  phone: string;
}

export type PropertyStatus = 'available' | 'rented' | 'sold' | 'maintenance';
export type PropertyType = 'apartment' | 'house' | 'condo' | 'commercial' | 'land' | 'office';

export interface Property {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  price: number;
  currency: string;
  location: PropertyLocation;
  features: PropertyFeatures;
  images: string[];
  defaultImageIndex?: number;
  status: PropertyStatus;
  ownerId: string;
  viewCount?: number;
  contactInfo: PropertyContactInfo;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyInput {
  title: string;
  description: string;
  type: PropertyType;
  price: number;
  currency?: string;
  location: PropertyLocation;
  features: PropertyFeatures;
  images?: string[];
  defaultImageIndex?: number;
  status?: PropertyStatus;
  contactInfo: PropertyContactInfo;
  base64Images?: Array<{
    data: string;
    fileName: string;
    contentType: string;
  }>;
}

export interface PropertyUpdate {
  title?: string;
  description?: string;
  type?: PropertyType;
  price?: number;
  currency?: string;
  location?: PropertyLocation;
  features?: PropertyFeatures;
  images?: string[];
  defaultImageIndex?: number;
  status?: PropertyStatus;
  contactInfo?: PropertyContactInfo;
  removeImages?: string[];
  base64Images?: Array<{
    data: string;
    fileName: string;
    contentType: string;
  }>;
}

export interface PropertyListResponse {
  items: Property[];
  lastKey?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

class PropertyService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Handle 204 No Content responses (e.g., DELETE)
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async listProperties(params?: {
    type?: string;
    limit?: number;
    lastKey?: string;
  }): Promise<PropertyListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.type) searchParams.append('type', params.type);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.lastKey) searchParams.append('lastKey', params.lastKey);

    const query = searchParams.toString();
    const endpoint = `/api/properties${query ? `?${query}` : ''}`;
    
    const response = await this.request<{ success: boolean; data: { items: any[]; lastKey?: string } }>(endpoint);
    // Handle nested response structure - the API returns { success: true, data: { items: [...] } }
    const responseData = response.data || response;
    // Ensure each property matches our Property interface
    return {
      ...responseData,
      items: (responseData.items || []).map(item => ({
        ...item,
        type: item.type as PropertyType,
        status: item.status as PropertyStatus,
      })),
    };
  }

  async getProperty(id: string): Promise<Property> {
    const response = await this.request<any>(`/api/properties/${id}`);
    // Handle nested response structure - extract data from response.data
    const propertyData = response.data || response;
    // Ensure the response matches our Property interface
    return {
      ...propertyData,
      type: propertyData.type as PropertyType,
      status: propertyData.status as PropertyStatus,
    };
  }

  async createProperty(propertyData: PropertyInput): Promise<Property> {
    const response = await this.request<any>(`/api/properties`, {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
    
    // Handle nested response structure - extract data from response.data
    const propertyData_result = response.data || response;
    
    // Ensure the response matches our Property interface
    return {
      ...propertyData_result,
      type: propertyData_result.type as PropertyType,
      status: propertyData_result.status as PropertyStatus,
    };
  }

  async updateProperty(id: string, updates: PropertyUpdate): Promise<Property> {
    const response = await this.request<any>(`/api/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    // Handle nested response structure - extract data from response.data
    const propertyData = response.data || response;
    
    // Ensure the response matches our Property interface
    return {
      ...propertyData,
      type: propertyData.type as PropertyType,
      status: propertyData.status as PropertyStatus,
    };
  }

  async deleteProperty(id: string): Promise<void> {
    const url = `${API_BASE_URL}/api/properties/${id}`;
    console.log('Making DELETE API call to:', url)
    
    const config: RequestInit = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      console.log('DELETE request config:', config)
      const response = await fetch(url, config);
      console.log('DELETE response status:', response.status)
      
      // 204 No Content is a successful delete - don't try to parse JSON
      if (response.status === 204) {
        console.log('Property deleted successfully (204 No Content)')
        return;
      }
      
      // For other status codes, try to parse error response
      if (!response.ok) {
        console.error('DELETE response not OK:', response.status, response.statusText)
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Ignore JSON parsing errors for error responses
        }
        throw new Error(errorMessage);
      }
      
      // If there's content, parse it
      const text = await response.text();
      if (text) {
        const data = JSON.parse(text);
        console.log('DELETE response data:', data)
      }
    } catch (error) {
      console.error('DELETE fetch error:', error)
      throw error;
    }
  }

  async searchProperties(query: string, limit?: number): Promise<{ items: Property[] }> {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    if (limit) searchParams.append('limit', limit.toString());

    const response = await this.request<{ success: boolean; data: { items: any[] } }>(`/api/properties/search?${searchParams.toString()}`);
    // Handle nested response structure - the API returns { success: true, data: { items: [...] } }
    const responseData = response.data || response;
    // Ensure each property matches our Property interface
    return {
      items: (responseData.items || []).map(item => ({
        ...item,
        type: item.type as PropertyType,
        status: item.status as PropertyStatus,
      })),
    };
  }

  async getPropertyImageUrls(propertyId: string, imageKeys: string[]): Promise<{ [key: string]: string }> {
    const urls: { [key: string]: string } = {};
    
    for (const imageKey of imageKeys) {
      try {
        const response = await this.request<{ success: boolean; data: { viewUrl: string } }>(`/api/properties/${propertyId}/images/view-url?imageKey=${encodeURIComponent(imageKey)}`);
        urls[imageKey] = response.data?.viewUrl || imageKey;
      } catch (error) {
        console.error(`Failed to get presigned URL for image ${imageKey}:`, error);
        // Fallback to direct URL
        urls[imageKey] = imageKey;
      }
    }
    
    return urls;
  }

  async uploadPropertyImage(
    propertyId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ url: string; key: string }> {
    // First get presigned URL
    const { uploadUrl, key } = await this.getPresignedUploadUrl(
      propertyId,
      file.name,
      file.type
    );

    // Upload file directly to S3
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const url = uploadUrl.split('?')[0]; // Remove query parameters
          resolve({ url, key });
        } else {
          reject(new Error('Upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  private async getPresignedUploadUrl(
    propertyId: string,
    fileName: string,
    contentType: string
  ): Promise<{ uploadUrl: string; key: string }> {
    const searchParams = new URLSearchParams();
    searchParams.append('fileName', fileName);
    searchParams.append('contentType', contentType);

    return this.request<{ uploadUrl: string; key: string }>(
      `/api/properties/${propertyId}/images/upload-url?${searchParams.toString()}`
    );
  }

  async getAllPropertyIds(): Promise<string[]> {
    try {
      const response = await this.request<{ items: Property[] }>('/api/properties?limit=100');
      return response.items?.map((property: Property) => property.id) || [];
    } catch (error) {
      console.error('Error fetching property IDs:', error);
      return [];
    }
  }
}

export const propertyService = new PropertyService();
