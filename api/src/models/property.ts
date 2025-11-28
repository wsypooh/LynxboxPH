import { v4 as uuidv4 } from 'uuid';
import { EntityType, BaseEntity } from '../lib/dynamodb';

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
    lat: number;
    lng: number;
  };
}

export interface PropertyContactInfo {
  name: string;
  email: string;
  phone: string;
}


export interface Property extends BaseEntity {
  [key: string]: any;  // Add index signature
  title: string;
  description: string;
  type: string;
  price: number;
  currency: string;
  location: PropertyLocation;
  features: PropertyFeatures;
  images: string[];
  status: string;
  ownerId: string;
  viewCount?: number;  // Make this optional
  contactInfo: PropertyContactInfo;
}

// Type for creating a new property (excludes auto-generated fields)
export type PropertyInput = Omit<Property, keyof BaseEntity | 'id' | 'viewCount' | 'PK' | 'SK' | 'GSI1PK' | 'GSI1SK' | 'entityType' | 'createdAt' | 'updatedAt'>;

export function createProperty(data: PropertyInput): Property {
  const now = new Date().toISOString();
  const id = uuidv4();

  // Create the property with all required fields
  const property: Property = {
    // Base entity fields
    PK: `PROPERTY#${id}`,
    SK: `PROPERTY#${id}`,
    GSI1PK: `PROPERTY#${data.type.toUpperCase()}`,
    GSI1SK: `CREATED_AT#${now}`,
    entityType: EntityType.PROPERTY,
    id,
    viewCount: 0,  // Default value
    createdAt: now,
    updatedAt: now,
    // Required fields from input
    title: data.title,
    description: data.description,
    type: data.type,
    price: data.price,
    currency: data.currency,
    location: data.location,
    features: data.features,
    images: data.images || [],
    status: data.status || 'available',
    ownerId: data.ownerId,
    contactInfo: data.contactInfo,
  };

  return property;
}
