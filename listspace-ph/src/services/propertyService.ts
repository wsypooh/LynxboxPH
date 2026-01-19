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
export type PropertyType = 'office' | 'commercial' | 'land';

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

import { getAuthHeaders } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

class PropertyService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get auth headers for protected endpoints
    const authHeaders = requireAuth ? await getAuthHeaders() : {};
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
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
    sortBy?: 'price' | 'area' | 'date' | 'views';
    sortOrder?: 'asc' | 'desc';
  }): Promise<PropertyListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.type) searchParams.append('type', params.type);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.lastKey) searchParams.append('lastKey', params.lastKey);
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

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

  async listPublicProperties(params?: {
    type?: string;
    city?: string;
    limit?: number;
    lastKey?: string;
    sortBy?: 'price' | 'area' | 'date' | 'views';
    sortOrder?: 'asc' | 'desc';
  }): Promise<PropertyListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.type) searchParams.append('type', params.type);
    if (params?.city) searchParams.append('city', params.city);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.lastKey) searchParams.append('lastKey', params.lastKey);
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    const endpoint = `/api/public/properties${query ? `?${query}` : ''}`;
    
    const response = await this.request<{ success: boolean; data: { items: any[]; lastKey?: string } }>(endpoint, {}, false); // No auth required
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

  async getPublicProperty(id: string): Promise<Property> {
    const response = await this.request<any>(`/api/public/properties/${id}`, {}, false); // No auth required
    // Handle nested response structure - extract data from response.data
    const propertyData = response.data || response;
    // Ensure the response matches our Property interface
    return {
      ...propertyData,
      type: propertyData.type as PropertyType,
      status: propertyData.status as PropertyStatus,
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
    const endpoint = `/api/properties/${id}`;
    
    const config: RequestInit = {
      method: 'DELETE',
    };

    try {
      await this.request<void>(endpoint, config, true); // Auth required
    } catch (error) {
      throw error;
    }
  }

  async searchProperties(query: string, limit?: number, sortBy?: 'price' | 'area' | 'date' | 'views', sortOrder?: 'asc' | 'desc'): Promise<{ items: Property[] }> {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    if (limit) searchParams.append('limit', limit.toString());
    if (sortBy) searchParams.append('sortBy', sortBy);
    if (sortOrder) searchParams.append('sortOrder', sortOrder);

    const response = await this.request<{ success: boolean; data: { items: any[] } }>(`/api/public/search?${searchParams.toString()}`, {}, false); // No auth required
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

  async searchUserProperties(query: string, limit?: number): Promise<{ items: Property[] }> {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    if (limit) searchParams.append('limit', limit.toString());

    const response = await this.request<{ success: boolean; data: { items: any[] } }>(`/api/properties/search?${searchParams.toString()}`, {}, true); // Auth required
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

  async filterProperties(filters: {
    type?: PropertyType[];
    priceMin?: number;
    priceMax?: number;
    minArea?: number;
    maxArea?: number;
    location?: string;
    features?: {
      parking?: boolean;
      furnished?: boolean;
      aircon?: boolean;
      wifi?: boolean;
      security?: boolean;
    };
    query?: string;
    limit?: number;
    sortBy?: 'price' | 'area' | 'date' | 'views';
    sortOrder?: 'asc' | 'desc';
    lastKey?: string;
  }): Promise<{ items: Property[]; lastKey?: string }> {
    const searchParams = new URLSearchParams();
    
    // Add type filters
    if (filters.type && filters.type.length > 0) {
      filters.type.forEach(type => searchParams.append('type', type));
    }
    
    // Add numeric filters
    if (filters.priceMin !== undefined) searchParams.append('priceMin', filters.priceMin.toString());
    if (filters.priceMax !== undefined) searchParams.append('priceMax', filters.priceMax.toString());
    if (filters.minArea !== undefined) searchParams.append('minArea', filters.minArea.toString());
    if (filters.maxArea !== undefined) searchParams.append('maxArea', filters.maxArea.toString());
    
    // Add string filters
    if (filters.location) searchParams.append('location', filters.location);
    if (filters.query) searchParams.append('query', filters.query);
    
    // Add feature filters
    if (filters.features) {
      if (filters.features.parking !== undefined) searchParams.append('parking', filters.features.parking.toString());
      if (filters.features.furnished !== undefined) searchParams.append('furnished', filters.features.furnished.toString());
      if (filters.features.aircon !== undefined) searchParams.append('aircon', filters.features.aircon.toString());
      if (filters.features.wifi !== undefined) searchParams.append('wifi', filters.features.wifi.toString());
      if (filters.features.security !== undefined) searchParams.append('security', filters.features.security.toString());
    }
    
    // Add sorting parameters
    if (filters.sortBy) searchParams.append('sortBy', filters.sortBy);
    if (filters.sortOrder) searchParams.append('sortOrder', filters.sortOrder);
    
    // Add limit
    if (filters.limit) searchParams.append('limit', filters.limit.toString());
    
    // Add pagination
    if (filters.lastKey) searchParams.append('lastKey', filters.lastKey);

    const response = await this.request<{ success: boolean; data: { items: any[]; lastKey?: string } }>(`/api/public/search?${searchParams.toString()}`, {}, false); // No auth required
    // Handle nested response structure - the API returns { success: true, data: { items: [...], lastKey?: string } }
    const responseData = response.data || response;
    // Ensure each property matches our Property interface
    return {
      items: (responseData.items || []).map(item => ({
        ...item,
        type: item.type as PropertyType,
        status: item.status as PropertyStatus,
      })),
      lastKey: responseData.lastKey
    };
  }

  async getPropertyImageUrls(propertyId: string, imageKeys: string[]): Promise<{ [key: string]: string }> {
    const urls: { [key: string]: string } = {};
    
    console.log(`Getting image URLs for property: ${propertyId}, imageKeys: ${imageKeys}`);
    
    for (const imageKey of imageKeys) {
      try {
        const endpoint = `/api/properties/${propertyId}/images/view-url?imageKey=${encodeURIComponent(imageKey)}`;
        console.log(`Making request to: ${API_BASE_URL}${endpoint}`);
        
        const response = await this.request<{ success: boolean; data: { viewUrl: string } }>(endpoint, {}, true); // Auth required
        console.log(`Response for imageKey ${imageKey}:`, response);
        
        urls[imageKey] = response.data?.viewUrl || imageKey;
      } catch (error) {
        console.error(`Failed to get presigned URL for image ${imageKey}:`, error);
        // Fallback to direct URL
        urls[imageKey] = imageKey;
      }
    }
    
    console.log(`Final URLs:`, urls);
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
      `/api/properties/${propertyId}/images/upload-url?${searchParams.toString()}`, {}, true // Auth required
    );
  }

  async getAllPropertyIds(): Promise<string[]> {
    try {
      const response = await this.request<{ items: Property[] }>('/api/properties?limit=100', {}, true); // Auth required
      return response.items?.map((property: Property) => property.id) || [];
    } catch (error) {
      console.error('Error fetching property IDs:', error);
      return [];
    }
  }
}

export const propertyService = new PropertyService();
