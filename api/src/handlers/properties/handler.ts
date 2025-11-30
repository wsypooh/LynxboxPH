// src/handlers/properties/handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PropertyRepository } from '../../repositories/propertyRepository';
import { ApiResponse } from '../../lib/apiResponse';
import { Property, PropertyFeatures, PropertyLocation, PropertyContactInfo } from '../../models/property';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient } from '../../lib/dynamodb';
import { S3Service } from '../../lib/s3';

export class PropertyHandler {
  static async createProperty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return ApiResponse.error('Request body is required', 400);
      }

      const contentType = event.headers['content-type'] || event.headers['Content-Type'];
      let propertyData: any;
      let uploadedImages: string[] = [];

      // Handle multipart form data (files + property data)
      if (contentType && contentType.includes('multipart/form-data')) {
        const { property, images } = await this.handleMultipartPropertyCreation(event);
        propertyData = property;
        uploadedImages = images;
      } else {
        // Handle JSON data with base64 images
        const body = JSON.parse(event.body);
        propertyData = body;

        // Handle base64 images if present
        if (body.base64Images && Array.isArray(body.base64Images)) {
          uploadedImages = await this.handleBase64Images(body.base64Images);
        }
      }

      // Basic validation
      const requiredFields = ['title', 'description', 'type', 'price', 'location', 'features', 'contactInfo'];
      const missingFields = requiredFields.filter(field => !(field in propertyData));
      
      if (missingFields.length > 0) {
        return ApiResponse.error(`Missing required fields: ${missingFields.join(', ')}`, 400);
      }

      // Extract user ID from request context (JWT disabled for testing)
      const userId = 'test-user-id'; // Fixed user ID for testing
      // JWT authorization temporarily disabled
      // const userId = event.requestContext.authorizer?.claims?.sub || 'test-user-id';
      // if (!userId) {
      //   return ApiResponse.unauthorized('User ID not found in request');
      // }

      // Remove base64Images from the data before storing - only keep S3 URLs
      const { base64Images, ...cleanPropertyData } = propertyData;

      const finalPropertyData = {
        ...cleanPropertyData,
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
          const uploadResult = await s3Service.uploadImage(fileBuffer, fileName, fileContentType);
          uploadedImages.push(uploadResult.url);
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

    return { property: propertyData, images: uploadedImages };
  }

  private static async handleBase64Images(base64Images: any[]): Promise<string[]> {
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
      const uploadResult = await s3Service.uploadImage(fileBuffer, fileName, contentType);
      uploadedImages.push(uploadResult.url);
    }

    return uploadedImages;
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
        await this.removePropertyImages(id, updates.removeImages);
      }

      // Handle new image uploads
      let uploadedImages: string[] = [];
      if (updates.base64Images && Array.isArray(updates.base64Images)) {
        uploadedImages = await this.handleBase64Images(updates.base64Images);
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
    
    for (const imageUrl of imageUrls) {
      try {
        // Extract key from URL
        const urlParts = imageUrl.split('/');
        const key = urlParts.slice(3).join('/'); // Remove https://bucket-name.s3.region.amazonaws.com/
        
        if (key) {
          await s3Service.deleteImage(key);
        }
      } catch (error) {
        console.error(`Failed to delete image ${imageUrl}:`, error);
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

    let result;
    if (type) {
      // List properties by type
      result = await PropertyRepository.listByType(type, limit, lastEvaluatedKey);
    } else {
      // List all properties (using a scan operation - be careful with large datasets)
      const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand({
        TableName: process.env.DYNAMODB_TABLE || 'listspace-ph-dev',
        FilterExpression: 'begins_with(PK, :pkPrefix)',
        ExpressionAttributeValues: {
          ':pkPrefix': 'PROPERTY#'
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey
      }));
      
      result = {
        items: Items as Property[],
        lastEvaluatedKey: LastEvaluatedKey
      };
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
      const query = event.queryStringParameters?.q;
      if (!query) {
        return ApiResponse.error('Search query is required', 400);
      }

      const limit = parseInt(event.queryStringParameters?.limit || '10');
      const properties = await PropertyRepository.search(query, limit);

      return ApiResponse.success({ items: properties });

    } catch (error) {
      console.error('Error searching properties:', error);
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
      const uploadResult = await s3Service.uploadImage(fileBuffer, fileName, fileContentType);

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

      const { url, key } = await s3Service.getPresignedUploadUrl(fileName, contentType);

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
  // Get the path from the request context (REST API v1)
  const path = event.resource;

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
    if (httpMethod === 'POST' && path.endsWith('/api/properties')) {
      return PropertyHandler.createProperty(event);
    } else if (httpMethod === 'GET' && path.includes('/api/properties/') && path.split('/').length === 4) {
      // Matches /api/properties/{id}
      return PropertyHandler.getProperty(event);
    } else if (httpMethod === 'PUT' && path.includes('/api/properties/') && path.split('/').length === 4) {
      // Matches /api/properties/{id}
      return PropertyHandler.updateProperty(event);
    } else if (httpMethod === 'DELETE' && path.includes('/api/properties/') && path.split('/').length === 4) {
      // Matches /api/properties/{id}
      return PropertyHandler.deleteProperty(event);
    } else if (httpMethod === 'GET' && (path.endsWith('/api/properties') || path.includes('/api/properties?'))) {
      // Matches /api/properties or /api/properties?param=value
      return PropertyHandler.listProperties(event);
    } else if (httpMethod === 'GET' && path.includes('/api/properties/search')) {
      return PropertyHandler.searchProperties(event);
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
      console.log('No route found for:', { httpMethod, path });
      return ApiResponse.error('Not Found', 404);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return ApiResponse.error('Internal Server Error', 500);
  }
};