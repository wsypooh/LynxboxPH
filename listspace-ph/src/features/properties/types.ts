export interface Property {
  id: string
  title: string
  description: string
  type: PropertyType
  price: number
  currency: 'PHP'
  location: {
    address: string
    city: string
    province: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  features: {
    area: number // in square meters
    parking: number
    floors: number
    furnished: boolean
    aircon: boolean
    wifi: boolean
    security: boolean
  }
  images: string[]
  defaultImageIndex?: number
  status: PropertyStatus
  ownerId: string
  createdAt: string
  updatedAt: string
  viewCount: number
  contactInfo: {
    name: string
    phone: string
    email: string
  }
}

export type PropertyType = 
  | 'office'
  | 'warehouse'
  | 'retail'
  | 'restaurant'
  | 'industrial'
  | 'mixed-use'

export type PropertyStatus = 
  | 'available'
  | 'rented'
  | 'pending'
  | 'maintenance'

export interface PropertyFilters {
  type?: PropertyType[]
  priceMin?: number
  priceMax?: number
  location?: string
  minArea?: number
  maxArea?: number
  features?: {
    parking?: boolean
    furnished?: boolean
    aircon?: boolean
    wifi?: boolean
    security?: boolean
  }
}

export interface PropertySearchParams {
  query?: string
  filters?: PropertyFilters
  sortBy?: 'price' | 'area' | 'date' | 'views'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}
