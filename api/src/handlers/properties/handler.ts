// src/handlers/properties/handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PropertyRepository, isListingCurrentlyVisible, isPropertyExpired } from '../../repositories/propertyRepository';
import { ApiResponse } from '../../lib/apiResponse';
import { Property, PropertyFeatures, PropertyLocation, PropertyContactInfo } from '../../models/property';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient } from '../../lib/dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from '../../lib/s3';
import { watermarkConfig, getWatermarkOptions } from '../../config/watermark';
import { canDestroy, canWrite, resolveActor } from '../../lib/auth';
import { PLAN_LIMITS, SEARCH_PLACEMENT_RANK } from '../../lib/planLimits';
import { AccountRepository } from '../../repositories/accountRepository';
import { maskContactInfo } from '../../lib/contactMasking';

export class PropertyHandler {
  static async createProperty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

    try {
      if (!event.body) {
        return ApiResponse.error('Request body is required', 400);
      }

      const propertyData = JSON.parse(event.body);
      // Images are uploaded direct-to-S3 beforehand (presigned upload-url + confirm), so the
      // client generates the id upfront and just sends the resulting keys here.
      const propertyId: string = propertyData.id || uuidv4();

      // Basic validation
      const requiredFields = ['title', 'description', 'type', 'price', 'location', 'features', 'contactInfo'];
      const missingFields = requiredFields.filter(field => !(field in propertyData));
      
      if (missingFields.length > 0) {
        return ApiResponse.error(`Missing required fields: ${missingFields.join(', ')}`, 400);
      }

      // Extract the authenticated user's account
      const actor = await resolveActor(event);
      if (!actor) {
        return ApiResponse.unauthorized('User authentication required');
      }
      if (!canWrite(actor)) {
        return ApiResponse.forbidden('You do not have permission to create properties');
      }
      const userId = actor.accountId;

      const finalPropertyData: any = {
        ...propertyData,
        id: propertyId, // Use the pre-generated ID
        ownerId: userId,
        currency: 'PHP', // Default currency
        status: 'available', // Default status
        images: propertyData.images || [],
      };

      // docs/Pricing-Strategy-Plan.md — plan-based listing count / photo count limits.
      // Only counts against the cap while it's actually taking up a public "slot": available
      // and not expired. Marking something rented/sold/maintenance, or just letting it expire,
      // frees up a slot on its own — no separate unlist step needed.
      const limits = PLAN_LIMITS[actor.plan];
      const { items: existingListings } = await PropertyRepository.listByOwner(userId, 1000);
      const activeListingCount = existingListings.filter(p => p.status === 'available' && !isPropertyExpired(p.expiresAt)).length;
      if (activeListingCount >= limits.maxProperties) {
        return ApiResponse.forbidden("You've reached your plan's active listing limit. Upgrade to add more.");
      }
      if (finalPropertyData.images.length > limits.maxPhotosPerListing) {
        return ApiResponse.forbidden(`Your plan allows up to ${limits.maxPhotosPerListing} photos per listing. Upgrade for more.`);
      }
      finalPropertyData.expiresAt = limits.listingDurationDays == null
        ? null
        : new Date(Date.now() + limits.listingDurationDays * 24 * 60 * 60 * 1000).toISOString();

      const property = await PropertyRepository.create(finalPropertyData);
      return ApiResponse.success(property, 201);

    } catch (error) {
      console.error('Error creating property:', error);
      return ApiResponse.error('Failed to create property', 500);
    }
  }

  // docs/Pricing-Strategy-Plan.md — public listings from higher-plan owners rank first by
  // default (featured > priority > standard), then by recency. Only applied to the default
  // browse order — an explicit sortBy from the caller (price/area/views) is left alone.
  private static async sortByPlacement(items: Property[]): Promise<Property[]> {
    if (items.length === 0) return items;
    const ownerIds = Array.from(new Set(items.map(p => p.ownerId)));
    const plans = await Promise.all(ownerIds.map(id => AccountRepository.getPlan(id)));
    const placementByOwner = new Map(ownerIds.map((id, i) => [id, PLAN_LIMITS[plans[i].plan].searchPlacement]));

    return [...items].sort((a, b) => {
      const rankDiff = SEARCH_PLACEMENT_RANK[placementByOwner.get(b.ownerId)!] - SEARCH_PLACEMENT_RANK[placementByOwner.get(a.ownerId)!];
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  static async getPublicProperty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const id = event.pathParameters?.id;
      
      if (!id) {
        return ApiResponse.error('Property ID is required', 400);
      }

      const property = await PropertyRepository.findById(id);
      if (!property) {
        return ApiResponse.notFound('Property not found');
      }

      // Only show available properties to the public — same visibility rule the
      // list/search paths already enforce (docs/Pricing-Strategy-Plan.md's expiry window,
      // docs/Payments-and-Subscription-Plan.md's past-due suspension), so an expired or
      // suspended listing can't still be reached via a direct/bookmarked link.
      if (property.status !== 'available' || !isListingCurrentlyVisible(property)) {
        return ApiResponse.error('Property not available', 404);
      }

      // Increment view count for public views
      await PropertyRepository.incrementViewCount(id);

      // Real phone/email are never sent to unauthenticated callers — only a masked form,
      // to keep the public list/search/detail responses from being scraped in bulk. The
      // real values are fetched one at a time via getPublicContactInfo below, on demand.
      return ApiResponse.success({ ...property, contactInfo: maskContactInfo(property.contactInfo) });

    } catch (error) {
      console.error('Error fetching public property:', error);
      return ApiResponse.error('Failed to fetch property', 500);
    }
  }

  // Real phone/email are only ever handed out one listing at a time, via this dedicated
  // call — never bundled into the list/search/detail responses above — so a scraper can't
  // harvest every listing's contact info from a single bulk request.
  static async getPublicContactInfo(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const id = event.pathParameters?.id;
      if (!id) {
        return ApiResponse.error('Property ID is required', 400);
      }

      const property = await PropertyRepository.findById(id);
      if (!property || property.deletedAt || property.status !== 'available' || !isListingCurrentlyVisible(property)) {
        return ApiResponse.notFound('Property not found');
      }

      return ApiResponse.success({
        phone: property.contactInfo?.phone,
        email: property.contactInfo?.email,
      });

    } catch (error) {
      console.error('Error fetching public contact info:', error);
      return ApiResponse.error('Failed to fetch contact info', 500);
    }
  }

  static async listPublicProperties(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const params = event.queryStringParameters || {};
      const type = params.type;
      const city = params.city;
      const limit = parseInt(params.limit || '10');
      const lastEvaluatedKey = params.lastKey 
        ? JSON.parse(decodeURIComponent(params.lastKey))
        : undefined;
      const sortBy = params.sortBy as 'price' | 'area' | 'date' | 'views';
      const sortOrder = params.sortOrder as 'asc' | 'desc';

      let result;
      if (type || city) {
        // Filter by type and/or city for public browsing
        result = await PropertyRepository.listPublicProperties({ type, city, limit, lastEvaluatedKey, sortBy, sortOrder });
      } else {
        // List all available properties
        result = await PropertyRepository.listAllAvailableProperties(limit, lastEvaluatedKey, sortBy, sortOrder);
      }

      const sortedItems = sortBy ? result.items : await PropertyHandler.sortByPlacement(result.items);
      const items = sortedItems.map(item => ({ ...item, contactInfo: maskContactInfo(item.contactInfo) }));
      const response: any = { items };
      if (result.lastEvaluatedKey) {
        response.lastKey = encodeURIComponent(JSON.stringify(result.lastEvaluatedKey));
      }

      return ApiResponse.success(response);

    } catch (error) {
      console.error('Error listing public properties:', error);
      return ApiResponse.error('Failed to list properties', 500);
    }
  }

  static async getProperty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const id = event.pathParameters?.id;
      if (!id) {
        return ApiResponse.error('Property ID is required', 400);
      }

      const property = await PropertyRepository.findById(id);
      if (!property || property.deletedAt) {
        return ApiResponse.notFound('Property not found');
      }

      return ApiResponse.success(property);

    } catch (error) {
      console.error('Error fetching property:', error);
      return ApiResponse.error('Failed to fetch property', 500);
    }
  }

  static async updateProperty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const id = event.pathParameters?.id;
      if (!id) {
        return ApiResponse.error('Property ID is required', 400);
      }

      if (!event.body) {
        return ApiResponse.error('Request body is required', 400);
      }

      const actor = await resolveActor(event);
      if (!actor) {
        return ApiResponse.unauthorized('User authentication required');
      }

      const property = await PropertyRepository.findById(id);
      if (!property || property.deletedAt) {
        return ApiResponse.notFound('Property not found');
      }

      if (property.ownerId !== actor.accountId) {
        return ApiResponse.forbidden('You do not have permission to update this property');
      }

      if (!canWrite(actor)) {
        return ApiResponse.forbidden('You do not have permission to update properties');
      }

      const updates = JSON.parse(event.body);

      // Handle image removal and replacement
      if (updates.removeImages && Array.isArray(updates.removeImages)) {
        console.log(`=== IMAGE DELETION TRIGGERED ===`);
        console.log(`Property ID: ${id}`);
        console.log(`Images to remove:`, updates.removeImages);
        await this.removePropertyImages(id, updates.removeImages);
        console.log(`=== IMAGE DELETION COMPLETED ===`);
      }

      // Images are uploaded direct-to-S3 beforehand (presigned upload-url + confirm) — the
      // client sends the final authoritative `images` list of keys directly. `removeImages`
      // (if present) only drives the actual S3 object deletion above, independent of this list.
      const finalImages: string[] = updates.images !== undefined ? updates.images : (property.images || []);

      const limits = PLAN_LIMITS[actor.plan];
      if (finalImages.length > limits.maxPhotosPerListing) {
        return ApiResponse.forbidden(`Your plan allows up to ${limits.maxPhotosPerListing} photos per listing. Upgrade for more.`);
      }

      // Remove fields that shouldn't be updated
      const { id: _, ownerId, createdAt, propertyNumber, removeImages, renew, ...validUpdates } = updates;
      validUpdates.images = finalImages;

      // docs/Pricing-Strategy-Plan.md — owner manually renews a listing whose visibility
      // window (set from their plan at creation time) has run out, instead of a cron job.
      if (renew) {
        validUpdates.expiresAt = limits.listingDurationDays == null
          ? null
          : new Date(Date.now() + limits.listingDurationDays * 24 * 60 * 60 * 1000).toISOString();
      }

      const updatedProperty = await PropertyRepository.update(id, validUpdates);
      if (!updatedProperty) {
        return ApiResponse.error('Failed to update property', 500);
      }

      return ApiResponse.success(updatedProperty);

    } catch (error) {
      console.error('Error updating property:', error);
      return ApiResponse.error('Failed to update property', 500);
    }
  }

  private static async removePropertyImages(propertyId: string, imageUrls: string[]): Promise<void> {
    const s3Service = new S3Service();
    
    for (const imageKey of imageUrls) {
      try {
        console.log(`Deleting image with key: ${imageKey}`);
        
        // imageKey is now already the S3 key, not a URL
        if (imageKey) {
          await s3Service.deleteImage(imageKey);
        }
      } catch (error) {
        console.error(`Failed to delete image ${imageKey}:`, error);
        // Continue with other images even if one fails
      }
    }
  }

  static async deleteProperty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const id = event.pathParameters?.id;
      if (!id) {
        return ApiResponse.error('Property ID is required', 400);
      }

      const actor = await resolveActor(event);
      if (!actor) {
        return ApiResponse.unauthorized('User authentication required');
      }

      const property = await PropertyRepository.findById(id);
      if (!property || property.deletedAt) {
        return ApiResponse.notFound('Property not found');
      }

      if (property.ownerId !== actor.accountId) {
        return ApiResponse.forbidden('You do not have permission to delete this property');
      }

      if (!canDestroy(actor)) {
        return ApiResponse.forbidden('You do not have permission to delete properties');
      }

      // Delete S3 images first
      const s3Service = new S3Service();
      try {
        await s3Service.deletePropertyImages(id);
      } catch (s3Error) {
        console.error('Failed to delete S3 images:', s3Error);
        // Continue with property deletion even if S3 cleanup fails
        // In production, you might want to handle this differently
      }

      const success = await PropertyRepository.delete(id);
      if (!success) {
        return ApiResponse.error('Failed to delete property', 500);
      }

      return ApiResponse.success({ id }, 204);

    } catch (error) {
      console.error('Error deleting property:', error);
      return ApiResponse.error('Failed to delete property', 500);
    }
  }

  static async listProperties(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const type = event.queryStringParameters?.type;
    const limit = parseInt(event.queryStringParameters?.limit || '10');
    const lastEvaluatedKey = event.queryStringParameters?.lastKey 
      ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey))
      : undefined;
    const sortBy = event.queryStringParameters?.sortBy as 'price' | 'area' | 'date' | 'views';
    const sortOrder = event.queryStringParameters?.sortOrder as 'asc' | 'desc';

    const actor = await resolveActor(event);
    if (!actor) {
      return ApiResponse.unauthorized('User authentication required');
    }
    const userId = actor.accountId;

    let result;
    if (type) {
      // List properties by type for the authenticated user
      result = await PropertyRepository.listByTypeAndOwner(type, userId, limit, lastEvaluatedKey, sortBy, sortOrder);
    } else {
      // List properties for the authenticated user only
      result = await PropertyRepository.listByOwner(userId, limit, lastEvaluatedKey, sortBy, sortOrder);
    }

    const response: any = { items: result.items };
    if (result.lastEvaluatedKey) {
      response.lastKey = encodeURIComponent(JSON.stringify(result.lastEvaluatedKey));
    }

    return ApiResponse.success(response);

  } catch (error) {
    console.error('Error listing properties:', error);
    return ApiResponse.error('Failed to list properties', 500);
  }
}

  static async searchProperties(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const params = event.queryStringParameters || {};
      const limit = parseInt(params.limit || '10');
      const sortBy = params.sortBy as 'price' | 'area' | 'date' | 'views';
      const sortOrder = params.sortOrder as 'asc' | 'desc';
      
      // Check if this is a public endpoint (no authentication required)
      const isPublicEndpoint = event.path.startsWith('/api/public/');
      
      // Extract user ID only for non-public endpoints
      let userId: string | undefined;
      if (!isPublicEndpoint) {
        const actor = await resolveActor(event);
        if (!actor) {
          return ApiResponse.unauthorized('User authentication required');
        }
        userId = actor.accountId;
      }

      // Build unified filters object
      const filters: any = {};
      
      // Handle search query (accept both 'q' and 'query' parameters)
      const searchQuery = params.q || params.query;
      if (searchQuery) {
        filters.query = searchQuery;
      }
      
      // Handle type array (e.g., type=apartment&type=house)
      if (params.type) {
        filters.type = Array.isArray(params.type) ? params.type : [params.type];
      }
      
      // Handle numeric filters
      if (params.priceMin) filters.priceMin = parseInt(params.priceMin);
      if (params.priceMax) filters.priceMax = parseInt(params.priceMax);
      if (params.minArea) filters.minArea = parseInt(params.minArea);
      if (params.maxArea) filters.maxArea = parseInt(params.maxArea);
      
      // Handle string filters
      if (params.location) filters.location = params.location;
      
      // Handle feature filters
      const features: any = {};
      if (params.parking !== undefined) features.parking = params.parking === 'true';
      if (params.furnished !== undefined) features.furnished = params.furnished === 'true';
      if (params.aircon !== undefined) features.aircon = params.aircon === 'true';
      if (params.wifi !== undefined) features.wifi = params.wifi === 'true';
      if (params.security !== undefined) features.security = params.security === 'true';
      if (Object.keys(features).length > 0) {
        filters.features = features;
      }
      
      // Add sorting parameters
      if (sortBy) filters.sortBy = sortBy;
      if (sortOrder) filters.sortOrder = sortOrder;
      
      // Add pagination support
      if (params.lastKey) {
        try {
          filters.lastKey = JSON.parse(decodeURIComponent(params.lastKey));
        } catch (error) {
          console.error('Error parsing lastKey:', error);
          // Continue without lastKey if parsing fails
        }
      }
      
      // Add user filter - only search user's own properties (for non-public endpoints)
      if (!isPublicEndpoint) {
        filters.ownerId = userId;
      } else {
        // For public endpoints, only show available properties
        filters.status = 'available';
      }
      
      // Add limit
      filters.limit = limit;
      
      // Use unified filter method for search
      const result = await PropertyRepository.filter(filters);
      
      return ApiResponse.success({
        items: result.items,
        count: result.items.length,
        lastKey: result.lastKey ? encodeURIComponent(JSON.stringify(result.lastKey)) : undefined
      });

    } catch (error) {
      console.error('Error searching properties:', error);
      return ApiResponse.error('Failed to search properties', 500);
    }
  }

  static async searchPublicProperties(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const params = event.queryStringParameters || {};
      const limit = parseInt(params.limit || '10');
      const sortBy = params.sortBy as 'price' | 'area' | 'date' | 'views';
      const sortOrder = params.sortOrder as 'asc' | 'desc';
      
      // Build unified filters object
      const filters: any = {};
      
      // Handle search query (accept both 'q' and 'query' parameters)
      const searchQuery = params.q || params.query;
      if (searchQuery) {
        filters.query = searchQuery;
      }
      
      // Handle type array (e.g., type=apartment&type=house)
      if (params.type) {
        filters.type = Array.isArray(params.type) ? params.type : [params.type];
      }
      
      // Handle numeric filters
      if (params.priceMin) filters.priceMin = parseInt(params.priceMin);
      if (params.priceMax) filters.priceMax = parseInt(params.priceMax);
      if (params.minArea) filters.minArea = parseInt(params.minArea);
      if (params.maxArea) filters.maxArea = parseInt(params.maxArea);
      
      // Handle string filters
      if (params.location) filters.location = params.location;
      
      // Handle feature filters
      const features: any = {};
      if (params.parking !== undefined) features.parking = params.parking === 'true';
      if (params.furnished !== undefined) features.furnished = params.furnished === 'true';
      if (params.aircon !== undefined) features.aircon = params.aircon === 'true';
      if (params.wifi !== undefined) features.wifi = params.wifi === 'true';
      if (params.security !== undefined) features.security = params.security === 'true';
      if (Object.keys(features).length > 0) {
        filters.features = features;
      }
      
      // Add sorting parameters
      if (sortBy) filters.sortBy = sortBy;
      if (sortOrder) filters.sortOrder = sortOrder;
      
      // Only search available properties for public access
      filters.status = 'available';
      
      // Add limit
      filters.limit = limit;
      
      // Use unified filter method for public search
      const result = await PropertyRepository.filter(filters);
      const sortedItems = filters.sortBy ? result.items : await PropertyHandler.sortByPlacement(result.items);
      const items = sortedItems.map(item => ({ ...item, contactInfo: maskContactInfo(item.contactInfo) }));

      return ApiResponse.success({
        items,
        count: items.length,
        lastKey: result.lastKey ? encodeURIComponent(JSON.stringify(result.lastKey)) : undefined
      });

    } catch (error) {
      console.error('Error searching public properties:', error);
      return ApiResponse.error('Failed to search properties', 500);
    }
  }

  // Generates a presigned URL for a static listing (no DynamoDB required).
  // Only validates that the key is scoped under properties/{propertyId}/.
  static async getStaticListingImageUrl(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const path = event.path || (event.requestContext as any)?.path || '';
      const pathMatch = path.match(/\/api\/public\/listings\/([^/]+)\/images\/view-url/);
      const propertyId = event.pathParameters?.id || pathMatch?.[1];
      let imageKey = event.queryStringParameters?.imageKey;

      if (!propertyId || !imageKey) {
        return ApiResponse.error('Property ID and imageKey are required', 400);
      }

      if (imageKey.startsWith('https://')) {
        imageKey = imageKey.split('/').slice(3).join('/');
      }

      if (!imageKey.startsWith(`properties/${propertyId}/`)) {
        return ApiResponse.forbidden('Image key does not belong to this listing');
      }

      const s3Service = new S3Service();
      const { url } = await s3Service.getPresignedViewUrl(imageKey);

      return ApiResponse.success({ viewUrl: url, expiresIn: 3600 });
    } catch (error) {
      console.error('Error generating static listing image URL:', error);
      return ApiResponse.error('Failed to generate presigned view URL', 500);
    }
  }

  static async getPublicPresignedViewUrl(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const propertyId = event.pathParameters?.id;
      let imageKey = event.queryStringParameters?.imageKey;
      
      if (!propertyId || !imageKey) {
        return ApiResponse.error('Property ID and imageKey are required', 400);
      }

      // Extract S3 key from full URL if needed
      if (imageKey.startsWith('https://')) {
        const urlParts = imageKey.split('/');
        imageKey = urlParts.slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/
      }

      // Verify property exists and is available
      const property = await PropertyRepository.findById(propertyId);
      if (!property) {
        return ApiResponse.notFound('Property not found');
      }

      // Only allow access to images of available properties — same visibility rule as
      // getPublicProperty above (expiry window / past-due suspension), not just status.
      if (property.status !== 'available' || !isListingCurrentlyVisible(property)) {
        return ApiResponse.forbidden('Property is not available for public viewing');
      }

      // Verify the image belongs to this property (check both full URL and key)
      const hasImage = property.images.some(img => {
        const imgKey = img.startsWith('https://')
          ? img.split('/').slice(3).join('/') 
          : img;
        return imgKey === imageKey;
      });

      if (!hasImage) {
        return ApiResponse.forbidden('Image does not belong to this property');
      }

      const s3Service = new S3Service();
      const { url } = await s3Service.getPresignedViewUrl(imageKey);

      return ApiResponse.success({
        viewUrl: url,
        expiresIn: 3600 // 1 hour
      });
    } catch (error) {
      console.error('Error generating public presigned view URL:', error);
      return ApiResponse.error('Failed to generate presigned view URL', 500);
    }
  }

  static async getPresignedViewUrl(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const propertyId = event.pathParameters?.id;
      let imageKey = event.queryStringParameters?.imageKey;
      
      if (!propertyId || !imageKey) {
        return ApiResponse.error('Property ID and imageKey are required', 400);
      }

      // Extract S3 key from full URL if needed
      if (imageKey.startsWith('https://')) {
        const urlParts = imageKey.split('/');
        imageKey = urlParts.slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/
      }

      // Verify property exists
      const property = await PropertyRepository.findById(propertyId);
      if (!property) {
        return ApiResponse.notFound('Property not found');
      }

      // Verify the image belongs to this property (check both full URL and key)
      const hasImage = property.images.some(img => {
        const imgKey = img.startsWith('https://') 
          ? img.split('/').slice(3).join('/') 
          : img;
        return imgKey === imageKey;
      });

      if (!hasImage) {
        return ApiResponse.forbidden('Image does not belong to this property');
      }

      const s3Service = new S3Service();
      const { url } = await s3Service.getPresignedViewUrl(imageKey);

      return ApiResponse.success({
        viewUrl: url,
        expiresIn: 3600 // 1 hour
      });
    } catch (error) {
      console.error('Error generating presigned view URL:', error);
      return ApiResponse.error('Failed to generate presigned view URL', 500);
    }
  }

  static async getPresignedUploadUrl(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const propertyId = event.pathParameters?.id;
      if (!propertyId) {
        return ApiResponse.error('Property ID is required', 400);
      }

      const fileName = event.queryStringParameters?.fileName;
      const contentType = event.queryStringParameters?.contentType;

      if (!fileName || !contentType) {
        return ApiResponse.error('fileName and contentType query parameters are required', 400);
      }

      const actor = await resolveActor(event);
      if (!actor) {
        return ApiResponse.unauthorized('User authentication required');
      }

      // A brand-new listing's id doesn't exist in DynamoDB yet at upload time (the client
      // generates the id upfront so images can be uploaded before the property is created) —
      // only enforce ownership when the property already exists.
      const property = await PropertyRepository.findById(propertyId);
      if (property && property.ownerId !== actor.accountId) {
        return ApiResponse.forbidden('You do not have permission to upload images for this property');
      }

      const s3Service = new S3Service();
      s3Service.validateImageFile(fileName, contentType, 0); // Size validation skipped for presigned URL

      const { url, key } = await s3Service.getPresignedUploadUrl(fileName, contentType, propertyId);

      return ApiResponse.success({
        uploadUrl: url,
        key: key,
        expiresIn: 3600
      });

    } catch (error) {
      console.error('Error generating presigned upload URL:', error);
      return ApiResponse.error('Failed to generate presigned upload URL', 500);
    }
  }

  // Step 3 of the direct-to-S3 upload flow: the raw file is already sitting in S3 (via the
  // presigned PUT), so this downloads that one object, runs it through the same
  // watermark/resize pipeline the old base64 path used, and overwrites it in place.
  static async confirmImageUpload(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const propertyId = event.pathParameters?.id;
      if (!propertyId) {
        return ApiResponse.error('Property ID is required', 400);
      }
      if (!event.body) {
        return ApiResponse.error('Request body is required', 400);
      }

      const actor = await resolveActor(event);
      if (!actor) {
        return ApiResponse.unauthorized('User authentication required');
      }

      const { key, fileName, contentType } = JSON.parse(event.body);
      if (!key || !fileName || !contentType) {
        return ApiResponse.error('key, fileName, and contentType are required', 400);
      }
      if (!key.startsWith(`properties/${propertyId}/images/`)) {
        return ApiResponse.forbidden('Image key does not belong to this listing');
      }

      // Same reasoning as getPresignedUploadUrl — a brand-new listing doesn't exist yet.
      const property = await PropertyRepository.findById(propertyId);
      if (property && property.ownerId !== actor.accountId) {
        return ApiResponse.forbidden('You do not have permission to upload images for this property');
      }

      const s3Service = new S3Service();
      const watermarkOptions = watermarkConfig.enabled ? getWatermarkOptions() : undefined;
      const result = await s3Service.processUploadedImage(key, fileName, contentType, watermarkOptions);

      return ApiResponse.success({ key: result.key, contentType: result.contentType, size: result.size });
    } catch (error) {
      console.error('Error confirming property image upload:', error);
      return ApiResponse.error('Failed to process uploaded image', 500);
    }
  }
}

// Lambda handler function
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const httpMethod = event.httpMethod;
  // Use path instead of resource for better local development compatibility
  const path = event.path || event.resource;

  // Add detailed logging for debugging
  console.log('=== REQUEST DEBUG ===');
  console.log('HTTP Method:', httpMethod);
  console.log('Path:', path);
  console.log('Resource:', event.resource);
  console.log('Path Parameters:', event.pathParameters);
  console.log('Query Parameters:', event.queryStringParameters);
  console.log('Headers:', event.headers);
  console.log('===================');

  try {
    // Handle CORS preflight requests
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: '',
      };
    }

    // Route the request to the appropriate handler method
    // More specific routes first - Image routes before generic property routes
    if (httpMethod === 'GET' && path.includes('/api/public/search')) {
      return PropertyHandler.searchPublicProperties(event);
    } else if (httpMethod === 'GET' && path.includes('/api/public/listings/') && path.includes('/images/view-url')) {
      // Matches /api/public/listings/{id}/images/view-url - Static listing images (no DynamoDB)
      return PropertyHandler.getStaticListingImageUrl(event);
    } else if (httpMethod === 'GET' && path.includes('/api/public/properties/') && path.includes('/images/view-url')) {
      // Matches /api/public/properties/{id}/images/view-url - Public presigned view URL (must come first)
      return PropertyHandler.getPublicPresignedViewUrl(event);
    } else if (httpMethod === 'GET' && path.includes('/api/public/properties/') && path.includes('/contact')) {
      // Matches /api/public/properties/{id}/contact - MUST come before generic /api/public/properties/{id}
      return PropertyHandler.getPublicContactInfo(event);
    } else if (httpMethod === 'GET' && path.includes('/api/public/properties') && event.pathParameters?.id) {
      // Matches /api/public/properties/{id} - check for path parameter
      return PropertyHandler.getPublicProperty(event);
    } else if (httpMethod === 'GET' && path.includes('/api/public/properties')) {
      return PropertyHandler.listPublicProperties(event);
    } else if (httpMethod === 'GET' && path.includes('/api/properties/search')) {
      return PropertyHandler.searchProperties(event);
    } else if (httpMethod === 'GET' && path.includes('/api/properties/') && path.includes('/images/view-url')) {
      // Matches /api/properties/{id}/images/view-url - MUST come before generic /api/properties/{id}
      return PropertyHandler.getPresignedViewUrl(event);
    } else if (httpMethod === 'GET' && path.includes('/api/properties/') && path.includes('/images/upload-url')) {
      // Matches /api/properties/{id}/images/upload-url - MUST come before generic /api/properties/{id}
      return PropertyHandler.getPresignedUploadUrl(event);
    } else if (httpMethod === 'POST' && path.includes('/api/properties/') && path.includes('/images/confirm')) {
      // Matches /api/properties/{id}/images/confirm - MUST come before generic /api/properties/{id}
      return PropertyHandler.confirmImageUpload(event);
    } else if (httpMethod === 'GET' && path.includes('/api/properties') && event.pathParameters?.id) {
      // Matches /api/properties/{id} - check for path parameter
      return PropertyHandler.getProperty(event);
    } else if (httpMethod === 'PUT' && path.includes('/api/properties') && event.pathParameters?.id) {
      // Matches /api/properties/{id} - check for path parameter
      return PropertyHandler.updateProperty(event);
    } else if (httpMethod === 'DELETE' && path.includes('/api/properties') && event.pathParameters?.id) {
      // Matches /api/properties/{id} - check for path parameter
      return PropertyHandler.deleteProperty(event);
    } else if (httpMethod === 'POST' && path.endsWith('/api/properties')) {
      return PropertyHandler.createProperty(event);
    } else if (httpMethod === 'GET' && (path.endsWith('/api/properties') || path.includes('/api/properties?'))) {
      // Matches /api/properties or /api/properties?param=value (authenticated)
      return PropertyHandler.listProperties(event);
    } else {
      console.log('No route found for:', { httpMethod, path, resource: event.resource, pathParameters: event.pathParameters });
      return ApiResponse.error('Not Found', 404);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return ApiResponse.error('Internal Server Error', 500);
  }
};
