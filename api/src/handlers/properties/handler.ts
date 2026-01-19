// src/handlers/properties/handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PropertyRepository } from '../../repositories/propertyRepository';
import { ApiResponse } from '../../lib/apiResponse';
import { Property, PropertyFeatures, PropertyLocation, PropertyContactInfo } from '../../models/property';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient } from '../../lib/dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from '../../lib/s3';

export class PropertyHandler {
  static async createProperty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log('CREATE PROPERTY CALLED!');
    try {
      console.log('=== CREATE PROPERTY START ===');
      console.log('Content-Type:', event.headers['content-type'] || event.headers['Content-Type']);
      
      if (!event.body) {
        return ApiResponse.error('Request body is required', 400);
      }

      const contentType = event.headers['content-type'] || event.headers['Content-Type'];
      let propertyData: any;
      let uploadedImages: string[] = [];

      let propertyId: string;

      // Handle multipart form data (files + property data)
      if (contentType && contentType.includes('multipart/form-data')) {
        console.log('Using multipart upload path');
        const { property, images } = await this.handleMultipartPropertyCreation(event);
        propertyData = property;
        uploadedImages = images;
        propertyId = property.id; // Use the ID generated in multipart handler
      } else {
        console.log('Using JSON upload path');
        // Handle JSON data with base64 images
        const body = JSON.parse(event.body);
        propertyData = body;

        // Generate property ID first for S3 folder structure
        propertyId = uuidv4();
        console.log('Generated propertyId:', propertyId);
      
        // Handle base64 images if present
        if (body.base64Images && Array.isArray(body.base64Images)) {
          console.log('Processing base64 images:', body.base64Images.length);
          uploadedImages = await this.handleBase64Images(body.base64Images, propertyId);
        }
      }

      // Basic validation
      const requiredFields = ['title', 'description', 'type', 'price', 'location', 'features', 'contactInfo'];
      const missingFields = requiredFields.filter(field => !(field in propertyData));
      
      if (missingFields.length > 0) {
        return ApiResponse.error(`Missing required fields: ${missingFields.join(', ')}`, 400);
      }

      // Extract user ID from authentication claims
      let userId: string;
      
      // Check for JWT claims first (always prioritize JWT)
      if (event.requestContext.authorizer?.claims?.sub) {
        userId = event.requestContext.authorizer.claims.sub;
      } 
      // Fallback to Cognito User ID from authorizer context
      else if (event.requestContext.authorizer?.claims?.['cognito:username']) {
        userId = event.requestContext.authorizer.claims['cognito:username'];
      }
      // Development fallback (when no auth is present)
      else if (process.env.IS_OFFLINE || process.env.NODE_ENV === 'development') {
        userId = 'test-user-id';
      } else {
        return ApiResponse.unauthorized('User authentication required');
      }

      // Remove base64Images from the data before storing - only keep S3 URLs
      const { base64Images, ...cleanPropertyData } = propertyData;

      const finalPropertyData = {
        ...cleanPropertyData,
        id: propertyId, // Use the pre-generated ID
        ownerId: userId,
        currency: 'PHP', // Default currency
        status: 'available', // Default status
        images: [...(propertyData.images || []), ...uploadedImages], // Combine existing and uploaded images
      };

      const property = await PropertyRepository.create(finalPropertyData);
      return ApiResponse.success(property, 201);

    } catch (error) {
      console.error('Error creating property:', error);
      return ApiResponse.error('Failed to create property', 500);
    }
  }

  private static async handleMultipartPropertyCreation(event: APIGatewayProxyEvent): Promise<{ property: any; images: string[] }> {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new Error('Content-Type must be multipart/form-data');
    }
    
    // Generate property ID first for S3 folder structure
    const propertyId = uuidv4();
    
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      throw new Error('Invalid multipart boundary');
    }
    
    const parts = event.body!.split(`--${boundary}`);
    
    let propertyData: any = {};
    let uploadedImages: string[] = [];
    const s3Service = new S3Service();

    for (const part of parts) {
      if (part.includes('Content-Disposition: form-data')) {
        const lines = part.split('\n');
        let name: string | null = null;
        let fileName: string | null = null;
        let fileContentType: string | null = null;
        let value: string | null = null;

        for (const line of lines) {
          if (line.includes('name=')) {
            name = line.split('name=')[1].trim().replace(/"/g, '');
          }
          if (line.includes('filename=')) {
            fileName = line.split('filename=')[1].trim().replace(/"/g, '');
          }
          if (line.includes('Content-Type:')) {
            fileContentType = line.split('Content-Type:')[1].trim();
          }
        }

        const headerEndIndex = part.indexOf('\r\n\r\n');
        if (headerEndIndex !== -1) {
          value = part.substring(headerEndIndex + 4).trim();
        }

        if (name === 'images' && fileName && fileContentType && value) {
          // Handle file upload
          s3Service.validateImageFile(fileName, fileContentType, Buffer.from(value, 'base64').length);
          const fileBuffer = Buffer.from(value, 'base64');
          // Use the generated propertyId for uploads during creation
          const uploadResult = await s3Service.uploadImage(fileBuffer, fileName, fileContentType, propertyId);
          uploadedImages.push(uploadResult.key); // Store only the S3 key
        } else if (name && value && !fileName) {
          // Handle form field (JSON property data)
          try {
            propertyData = JSON.parse(value);
          } catch {
            propertyData[name] = value;
          }
        }
      }
    }

    return { property: { ...propertyData, id: propertyId }, images: uploadedImages };
  }

  private static async handleBase64Images(base64Images: any[], propertyId?: string): Promise<string[]> {
    const uploadedImages: string[] = [];
    const s3Service = new S3Service();

    for (const imageData of base64Images) {
      const { data, fileName, contentType } = imageData;
      
      if (!data || !fileName || !contentType) {
        throw new Error('Each base64 image must include data, fileName, and contentType');
      }

      // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
      const base64Data = data.includes(',') ? data.split(',')[1] : data;
      const fileBuffer = Buffer.from(base64Data, 'base64');

      s3Service.validateImageFile(fileName, contentType, fileBuffer.length);
      const uploadResult = await s3Service.uploadImage(fileBuffer, fileName, contentType, propertyId);
      uploadedImages.push(uploadResult.key); // Store only the S3 key
    }

    return uploadedImages;
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

      // Only show available properties to the public
      if (property.status !== 'available') {
        return ApiResponse.error('Property not available', 404);
      }

      // Increment view count for public views
      await PropertyRepository.incrementViewCount(id);

      return ApiResponse.success(property);

    } catch (error) {
      console.error('Error fetching public property:', error);
      return ApiResponse.error('Failed to fetch property', 500);
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

      const response: any = { items: result.items };
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
      if (!property) {
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

      const updates = JSON.parse(event.body);
      
      // Handle image removal and replacement
      if (updates.removeImages && Array.isArray(updates.removeImages)) {
        console.log(`=== IMAGE DELETION TRIGGERED ===`);
        console.log(`Property ID: ${id}`);
        console.log(`Images to remove:`, updates.removeImages);
        await this.removePropertyImages(id, updates.removeImages);
        console.log(`=== IMAGE DELETION COMPLETED ===`);
      }

      // Handle new image uploads
      let uploadedImages: string[] = [];
      if (updates.base64Images && Array.isArray(updates.base64Images)) {
        uploadedImages = await this.handleBase64Images(updates.base64Images, id);
      }

      // Combine existing images (minus removed ones) with new uploads
      const property = await PropertyRepository.findById(id);
      if (!property) {
        return ApiResponse.notFound('Property not found');
      }

      const currentImages = property.images || [];
      const imagesToRemove = updates.removeImages || [];
      const remainingImages = currentImages.filter(img => !imagesToRemove.includes(img));
      const finalImages = [...remainingImages, ...uploadedImages];

      // Remove fields that shouldn't be updated
      const { id: _, ownerId, createdAt, removeImages, base64Images, ...validUpdates } = updates;
      validUpdates.images = finalImages;

      // In a real app, you'd verify the current user is the owner
      // if (property.ownerId !== userId) {
      //   return ApiResponse.forbidden('You do not have permission to update this property');
      // }

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

      // Verify ownership (in a real app, you'd check if the current user is the owner)
      const property = await PropertyRepository.findById(id);
      if (!property) {
        return ApiResponse.notFound('Property not found');
      }

      // In a real app, you'd verify the current user is the owner
      // const userId = event.requestContext.authorizer?.claims?.sub;
      // if (property.ownerId !== userId) {
      //   return ApiResponse.forbidden('You do not have permission to delete this property');
      // }

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

    // Extract user ID from authentication claims
    let userId: string;
    
    // Check for JWT claims first (always prioritize JWT)
    if (event.requestContext.authorizer?.claims?.sub) {
      userId = event.requestContext.authorizer.claims.sub;
    } 
    // Fallback to Cognito User ID from authorizer context
    else if (event.requestContext.authorizer?.claims?.['cognito:username']) {
      userId = event.requestContext.authorizer.claims['cognito:username'];
    }
    // Development fallback (when no auth is present)
    else if (process.env.IS_OFFLINE || process.env.NODE_ENV === 'development') {
      userId = event.queryStringParameters?.ownerId || 'test-user-id';
    } else {
      return ApiResponse.unauthorized('User authentication required');
    }

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
        // Check for JWT claims first (production)
        if (event.requestContext.authorizer?.claims?.sub) {
          userId = event.requestContext.authorizer.claims.sub;
        } 
        // Fallback to Cognito User ID from authorizer context
        else if (event.requestContext.authorizer?.claims?.['cognito:username']) {
          userId = event.requestContext.authorizer.claims['cognito:username'];
        }
        // Development fallback (when auth is disabled)
        else if (process.env.IS_OFFLINE || process.env.NODE_ENV === 'development') {
          userId = 'test-user-id';
          console.log('Development mode: using fallback userId:', userId);
        } else {
          return ApiResponse.unauthorized('User authentication required');
        }
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
      
      return ApiResponse.success({
        items: result.items,
        count: result.items.length,
        lastKey: result.lastKey ? encodeURIComponent(JSON.stringify(result.lastKey)) : undefined
      });

    } catch (error) {
      console.error('Error searching public properties:', error);
      return ApiResponse.error('Failed to search properties', 500);
    }
  }

  static async uploadPropertyImage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const propertyId = event.pathParameters?.id;
      if (!propertyId) {
        return ApiResponse.error('Property ID is required', 400);
      }

      if (!event.body) {
        return ApiResponse.error('Request body is required', 400);
      }

      // Parse the multipart form data
      const contentType = event.headers['content-type'] || event.headers['Content-Type'];
      
      if (!contentType || !contentType.includes('multipart/form-data')) {
        return ApiResponse.error('Content-Type must be multipart/form-data', 400);
      }

      const body = event.body;
      const isBase64Encoded = event.isBase64Encoded;
      
      if (!isBase64Encoded) {
        return ApiResponse.error('File must be base64 encoded', 400);
      }

      // Parse the multipart data (simplified approach - in production, use a proper multipart parser)
      const boundary = contentType.split('boundary=')[1];
      const parts = body.split(`--${boundary}`);
      
      let fileData: string | null = null;
      let fileName: string | null = null;
      let fileContentType: string | null = null;

      for (const part of parts) {
        if (part.includes('Content-Disposition: form-data') && part.includes('name="image"')) {
          const lines = part.split('\n');
          for (const line of lines) {
            if (line.includes('filename=')) {
              fileName = line.split('filename=')[1].trim().replace(/"/g, '');
            }
            if (line.includes('Content-Type:')) {
              fileContentType = line.split('Content-Type:')[1].trim();
            }
          }
          // Extract the base64 file data (everything after the headers)
          const headerEndIndex = part.indexOf('\r\n\r\n');
          if (headerEndIndex !== -1) {
            fileData = part.substring(headerEndIndex + 4).trim();
          }
          break;
        }
      }

      if (!fileData || !fileName || !fileContentType) {
        return ApiResponse.error('Invalid file upload data', 400);
      }

      // Convert base64 to buffer
      const fileBuffer = Buffer.from(fileData, 'base64');

      // Validate file
      const s3Service = new S3Service();
      s3Service.validateImageFile(fileName, fileContentType, fileBuffer.length);

      // Upload to S3
      const uploadResult = await s3Service.uploadImage(fileBuffer, fileName, fileContentType, propertyId);

      // Update property with new image URL
      const property = await PropertyRepository.findById(propertyId);
      if (!property) {
        return ApiResponse.notFound('Property not found');
      }

      const updatedImages = [...(property.images || []), uploadResult.url];
      await PropertyRepository.update(propertyId, { images: updatedImages });

      return ApiResponse.success({ 
        message: 'Image uploaded successfully',
        image: {
          url: uploadResult.url,
          key: uploadResult.key
        }
      }, 201);

    } catch (error) {
      console.error('Error uploading property image:', error);
      return ApiResponse.error('Failed to upload property image', 500);
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

      // Verify property exists
      const property = await PropertyRepository.findById(propertyId);
      if (!property) {
        return ApiResponse.notFound('Property not found');
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: '',
      };
    }

    // Route the request to the appropriate handler method
    // More specific routes first - ID routes before generic routes
    if (httpMethod === 'GET' && path.includes('/api/public/search')) {
      return PropertyHandler.searchPublicProperties(event);
    } else if (httpMethod === 'GET' && path.includes('/api/public/properties') && event.pathParameters?.id) {
      // Matches /api/public/properties/{id} - check for path parameter
      return PropertyHandler.getPublicProperty(event);
    } else if (httpMethod === 'GET' && path.includes('/api/public/properties')) {
      return PropertyHandler.listPublicProperties(event);
    } else if (httpMethod === 'GET' && path.includes('/api/properties/search')) {
      return PropertyHandler.searchProperties(event);
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
    } else if (httpMethod === 'POST' && path.includes('/api/properties/') && path.includes('/images')) {
      // Matches /api/properties/{id}/images
      return PropertyHandler.uploadPropertyImage(event);
    } else if (httpMethod === 'GET' && path.includes('/api/properties/') && path.includes('/images/upload-url')) {
      // Matches /api/properties/{id}/images/upload-url
      return PropertyHandler.getPresignedUploadUrl(event);
    } else if (httpMethod === 'GET' && path.includes('/api/properties/') && path.includes('/images/view-url')) {
      // Matches /api/properties/{id}/images/view-url
      return PropertyHandler.getPresignedViewUrl(event);
    } else {
      console.log('No route found for:', { httpMethod, path, resource: event.resource, pathParameters: event.pathParameters });
      return ApiResponse.error('Not Found', 404);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return ApiResponse.error('Internal Server Error', 500);
  }
};
