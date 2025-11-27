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
  id: string;
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
  viewCount: number;
  contactInfo: PropertyContactInfo;
}

export function createProperty(data: Omit<Property, keyof BaseEntity | 'id' | 'viewCount'>): Property {
  const now = new Date().toISOString();
  const id = uuidv4();
  
  return {
    ...data,
    id,
    viewCount: 0,
    PK: `PROPERTY#${id}`,
    SK: `PROPERTY#${id}`,
    GSI1PK: `PROPERTY#${data.type.toUpperCase()}`,
    GSI1SK: now,
    entityType: EntityType.PROPERTY,
    createdAt: now,
    updatedAt: now,
  };
}
