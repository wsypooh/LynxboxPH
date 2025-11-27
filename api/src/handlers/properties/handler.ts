// src/handlers/properties/handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PropertyRepository } from '../../repositories/propertyRepository';
import { ApiResponse } from '../../lib/apiResponse';
import { Property, PropertyFeatures, PropertyLocation, PropertyContactInfo } from '../../models/property';

export class PropertyHandler {
  static async createProperty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return ApiResponse.error('Request body is required', 400);
      }

      const body = JSON.parse(event.body);
      
      // Basic validation
      const requiredFields = ['title', 'description', 'type', 'price', 'location', 'features', 'contactInfo'];
      const missingFields = requiredFields.filter(field => !(field in body));
      
      if (missingFields.length > 0) {
        return ApiResponse.error(`Missing required fields: ${missingFields.join(', ')}`, 400);
      }

      // Extract user ID from request context (assuming using Cognito authorizer)
      const userId = event.requestContext.authorizer?.claims?.sub;
      if (!userId) {
        return ApiResponse.unauthorized('User ID not found in request');
      }

      const propertyData = {
        ...body,
        ownerId: userId,
        currency: 'PHP', // Default currency
        status: 'available', // Default status
        images: body.images || [], // Default empty array if no images
      };

      const property = await PropertyRepository.create(propertyData);
      return ApiResponse.success(property, 201);

    } catch (error) {
      console.error('Error creating property:', error);
      return ApiResponse.error('Failed to create property', 500);
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
      
      // Remove fields that shouldn't be updated
      const { id: _, ownerId, createdAt, ...validUpdates } = updates;

      // Verify ownership (in a real app, you'd check if the current user is the owner)
      const property = await PropertyRepository.findById(id);
      if (!property) {
        return ApiResponse.notFound('Property not found');
      }

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
      const type = event.queryStringParameters?.type || '';
      const limit = parseInt(event.queryStringParameters?.limit || '10');
      const lastEvaluatedKey = event.queryStringParameters?.lastKey 
        ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey))
        : undefined;

      const { items, lastEvaluatedKey: newLastKey } = await PropertyRepository.listByType(
        type,
        limit,
        lastEvaluatedKey
      );

      const response: any = { items };
      if (newLastKey) {
        response.lastKey = encodeURIComponent(JSON.stringify(newLastKey));
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
}

// Lambda handler function
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const httpMethod = event.httpMethod;
  const path = event.resource;

  try {
    // Route the request to the appropriate handler method
    if (httpMethod === 'POST' && path === '/properties') {
      return PropertyHandler.createProperty(event);
    } else if (httpMethod === 'GET' && path === '/properties/{id}') {
      return PropertyHandler.getProperty(event);
    } else if (httpMethod === 'PUT' && path === '/properties/{id}') {
      return PropertyHandler.updateProperty(event);
    } else if (httpMethod === 'DELETE' && path === '/properties/{id}') {
      return PropertyHandler.deleteProperty(event);
    } else if (httpMethod === 'GET' && path === '/properties') {
      return PropertyHandler.listProperties(event);
    } else if (httpMethod === 'GET' && path === '/properties/search') {
      return PropertyHandler.searchProperties(event);
    } else {
      return ApiResponse.error('Not Found', 404);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return ApiResponse.error('Internal Server Error', 500);
  }
};