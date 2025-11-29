import { Property, PropertySearchParams, PropertyFilters } from '../types'

// Mock data for development - will be replaced with actual API calls
const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Modern Office Space in Makati CBD',
    description: 'Prime office space located in the heart of Makati Central Business District. Perfect for startups and growing businesses.',
    type: 'office',
    price: 50000,
    currency: 'PHP',
    location: {
      address: '123 Ayala Avenue, Makati City',
      city: 'Makati',
      province: 'Metro Manila',
      coordinates: {
        lat: 14.5547,
        lng: 121.0244
      }
    },
    features: {
      area: 120,
      parking: 2,
      floors: 1,
      furnished: true,
      aircon: true,
      wifi: true,
      security: true
    },
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    status: 'available',
    ownerId: 'owner-1',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
    viewCount: 45,
    contactInfo: {
      name: 'Maria Santos',
      phone: '+63 917 123 4567',
      email: 'maria.santos@email.com'
    }
  },
  {
    id: '2',
    title: 'Warehouse Space in Laguna',
    description: 'Large warehouse facility with loading docks and ample storage space. Ideal for logistics and distribution.',
    type: 'warehouse',
    price: 80000,
    currency: 'PHP',
    location: {
      address: '456 Industrial Road, Sta. Rosa',
      city: 'Sta. Rosa',
      province: 'Laguna',
      coordinates: {
        lat: 14.3119,
        lng: 121.1113
      }
    },
    features: {
      area: 500,
      parking: 10,
      floors: 1,
      furnished: false,
      aircon: false,
      wifi: true,
      security: true
    },
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1605152276897-4f618f831968?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    status: 'available',
    ownerId: 'owner-2',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
    viewCount: 23,
    contactInfo: {
      name: 'Juan Cruz',
      phone: '+63 918 987 6543',
      email: 'juan.cruz@email.com'
    }
  },
  {
    id: '3',
    title: 'Retail Space in Ortigas Center',
    description: 'Ground floor retail space with high foot traffic. Perfect for restaurants, cafes, or retail stores.',
    type: 'retail',
    price: 75000,
    currency: 'PHP',
    location: {
      address: '789 EDSA, Ortigas Center',
      city: 'Pasig',
      province: 'Metro Manila',
      coordinates: {
        lat: 14.5866,
        lng: 121.0581
      }
    },
    features: {
      area: 80,
      parking: 3,
      floors: 1,
      furnished: false,
      aircon: true,
      wifi: true,
      security: true
    },
    images: [
      'https://images.unsplash.com/photo-1600607686527-6fb886090705?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    status: 'available',
    ownerId: 'owner-3',
    createdAt: '2024-01-12T14:00:00Z',
    updatedAt: '2024-01-12T14:00:00Z',
    viewCount: 67,
    contactInfo: {
      name: 'Ana Reyes',
      phone: '+63 919 456 7890',
      email: 'ana.reyes@email.com'
    }
  }
]

export class PropertyService {
  private static getNextId(): string {
    // Generate a simple ID for mock data
    return (mockProperties.length + 1).toString()
  }

  static async createProperty(propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'>): Promise<Property> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    const newProperty: Property = {
      ...propertyData,
      id: this.getNextId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0,
      // Ensure required fields have default values if not provided
      images: propertyData.images || [],
      location: {
        address: propertyData.location.address || '',
        city: propertyData.location.city || '',
        province: propertyData.location.province || '',
        coordinates: propertyData.location.coordinates || { lat: 0, lng: 0 }
      },
      features: {
        area: propertyData.features.area || 0,
        parking: propertyData.features.parking || 0,
        floors: propertyData.features.floors || 1,
        furnished: propertyData.features.furnished || false,
        aircon: propertyData.features.aircon || false,
        wifi: propertyData.features.wifi || false,
        security: propertyData.features.security || false
      },
      contactInfo: {
        name: propertyData.contactInfo.name || '',
        phone: propertyData.contactInfo.phone || '',
        email: propertyData.contactInfo.email || ''
      }
    }

    // Add to mock data
    mockProperties.unshift(newProperty) // Add to beginning of array
    
    return newProperty
  }

  static async searchProperties(params: PropertySearchParams = {}): Promise<{
    properties: Property[]
    total: number
    page: number
    totalPages: number
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    let filteredProperties = [...mockProperties]

    // Apply search query
    if (params.query) {
      const query = params.query.toLowerCase()
      filteredProperties = filteredProperties.filter(property =>
        property.title.toLowerCase().includes(query) ||
        property.description.toLowerCase().includes(query) ||
        property.location.address.toLowerCase().includes(query) ||
        property.location.city.toLowerCase().includes(query)
      )
    }

    // Apply filters
    if (params.filters) {
      const filters = params.filters

      // Filter by property type
      if (filters.type && Array.isArray(filters.type) && filters.type.length > 0) {
        filteredProperties = filteredProperties.filter(property =>
          filters.type!.includes(property.type)
        )
      }

      // Filter by price range
      if (filters.priceMin !== undefined && filters.priceMin > 0) {
        filteredProperties = filteredProperties.filter(property =>
          property.price >= filters.priceMin!
        )
      }

      if (filters.priceMax !== undefined && filters.priceMax > 0) {
        filteredProperties = filteredProperties.filter(property =>
          property.price <= filters.priceMax!
        )
      }

      // Filter by area range
      if (filters.minArea !== undefined && filters.minArea > 0) {
        filteredProperties = filteredProperties.filter(property =>
          property.features.area >= filters.minArea!
        )
      }

      if (filters.maxArea !== undefined && filters.maxArea > 0) {
        filteredProperties = filteredProperties.filter(property =>
          property.features.area <= filters.maxArea!
        )
      }

      // Filter by location
      if (filters.location) {
        const location = filters.location.toLowerCase()
        filteredProperties = filteredProperties.filter(property =>
          property.location.city.toLowerCase().includes(location) ||
          property.location.province.toLowerCase().includes(location) ||
          property.location.address.toLowerCase().includes(location)
        )
      }

      // Filter by features
      if (filters.features) {
        const { features } = filters;
        
        if (features.parking) {
          filteredProperties = filteredProperties.filter(
            property => property.features.parking > 0
          );
        }
        
        if (features.furnished) {
          filteredProperties = filteredProperties.filter(
            property => property.features.furnished === true
          );
        }
        
        if (features.aircon) {
          filteredProperties = filteredProperties.filter(
            property => property.features.aircon === true
          );
        }
        
        if (features.wifi) {
          filteredProperties = filteredProperties.filter(
            property => property.features.wifi === true
          );
        }
        
        if (features.security) {
          filteredProperties = filteredProperties.filter(
            property => property.features.security === true
          );
        }
      }
    }

    // Apply sorting
    if (params.sortBy) {
      filteredProperties.sort((a, b) => {
        let aValue: number
        let bValue: number

        switch (params.sortBy) {
          case 'price':
            aValue = a.price
            bValue = b.price
            break
          case 'area':
            aValue = a.features.area
            bValue = b.features.area
            break
          case 'date':
            aValue = new Date(a.createdAt).getTime()
            bValue = new Date(b.createdAt).getTime()
            break
          case 'views':
            aValue = a.viewCount
            bValue = b.viewCount
            break
          default:
            return 0
        }

        return params.sortOrder === 'desc' ? bValue - aValue : aValue - bValue
      })
    }

    // Apply pagination
    const page = params.page || 1
    const limit = params.limit || 12
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedProperties = filteredProperties.slice(startIndex, endIndex)

    return {
      properties: paginatedProperties,
      total: filteredProperties.length,
      page,
      totalPages: Math.ceil(filteredProperties.length / limit)
    }
  }

  static async getPropertyById(id: string): Promise<Property | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    const property = mockProperties.find(p => p.id === id)
    if (property) {
      // Increment view count
      property.viewCount += 1
    }
    return property || null
  }

  static async getAllPropertyIds(): Promise<string[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))
    return mockProperties.map(p => p.id)
  }


  static async updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600))

    const propertyIndex = mockProperties.findIndex(p => p.id === id)
    if (propertyIndex === -1) return null

    const updatedProperty = {
      ...mockProperties[propertyIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    mockProperties[propertyIndex] = updatedProperty
    return updatedProperty
  }

  static async deleteProperty(id: string): Promise<boolean> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400))

    const propertyIndex = mockProperties.findIndex(p => p.id === id)
    if (propertyIndex === -1) return false

    mockProperties.splice(propertyIndex, 1)
    return true
  }
}
