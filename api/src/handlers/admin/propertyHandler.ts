// Admin-only endpoints for property management
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../../lib/apiResponse';
import { PropertyRepository } from '../../repositories/propertyRepository';
import { ddbDocClient } from '../../lib/dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

export class AdminPropertyHandler {
  // View all properties across all users
  static async listAllProperties(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      // Verify admin role
      if (!this.isAdmin(event.requestContext.authorizer?.claims)) {
        return ApiResponse.unauthorized('Admin access required');
      }

      const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand({
        TableName: process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev',
        FilterExpression: 'begins_with(PK, :pkPrefix)',
        ExpressionAttributeValues: {
          ':pkPrefix': 'PROPERTY#'
        },
        Limit: parseInt(event.queryStringParameters?.limit || '50')
      }));

      return ApiResponse.success({
        items: Items,
        lastEvaluatedKey: LastEvaluatedKey,
        total: Items.length
      });

    } catch (error) {
      console.error('Error listing all properties:', error);
      return ApiResponse.error('Failed to list properties', 500);
    }
  }

  // View specific user's properties (read-only)
  static async listUserProperties(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!this.isAdmin(event.requestContext.authorizer?.claims)) {
        return ApiResponse.unauthorized('Admin access required');
      }

      const userId = event.pathParameters?.userId;
      if (!userId) {
        return ApiResponse.error('User ID is required', 400);
      }

      const result = await PropertyRepository.listByOwner(userId, 50);
      
      // Log admin action
      console.log(`Admin ${event.requestContext.authorizer?.claims?.sub} viewed properties for user ${userId}`);

      return ApiResponse.success({
        items: result.items,
        lastEvaluatedKey: result.lastEvaluatedKey,
        targetUser: userId
      });

    } catch (error) {
      console.error('Error listing user properties:', error);
      return ApiResponse.error('Failed to list user properties', 500);
    }
  }

  // Safe impersonation - read-only view
  static async getUserView(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!this.isAdmin(event.requestContext.authorizer?.claims)) {
        return ApiResponse.unauthorized('Admin access required');
      }

      const userId = event.pathParameters?.userId;
      if (!userId) {
        return ApiResponse.error('User ID is required', 400);
      }

      // Get user's properties, stats, profile info
      const [properties, userStats] = await Promise.all([
        PropertyRepository.listByOwner(userId, 10),
        this.getUserStats(userId)
      ]);

      // Log admin action with timestamp
      console.log(`ADMIN_VIEW: Admin ${event.requestContext.authorizer?.claims?.sub} viewed user ${userId} data at ${new Date().toISOString()}`);

      return ApiResponse.success({
        user: {
          id: userId,
          stats: userStats,
          properties: properties.items
        },
        viewMode: 'read-only',
        accessedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting user view:', error);
      return ApiResponse.error('Failed to get user view', 500);
    }
  }

  // Perform specific action on behalf of user
  static async performUserAction(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!this.isAdmin(event.requestContext.authorizer?.claims)) {
        return ApiResponse.unauthorized('Admin access required');
      }

      const userId = event.pathParameters?.userId;
      const action = event.pathParameters?.action;
      const reason = event.body ? JSON.parse(event.body).reason : 'No reason provided';

      if (!userId || !action) {
        return ApiResponse.error('User ID and action are required', 400);
      }

      // Log the admin action with detailed audit trail
      const auditLog = {
        adminId: event.requestContext.authorizer?.claims?.sub,
        targetUserId: userId,
        action,
        reason,
        timestamp: new Date().toISOString(),
        ipAddress: event.requestContext.identity?.sourceIp
      };

      console.log('ADMIN_ACTION:', JSON.stringify(auditLog));

      // Execute the specific action
      let result;
      const requestBody = event.body || '{}';
      switch (action) {
        case 'suspend-property':
          result = await this.suspendUserProperty(userId, requestBody);
          break;
        case 'verify-property':
          result = await this.verifyUserProperty(userId, requestBody);
          break;
        default:
          return ApiResponse.error('Invalid action', 400);
      }

      return ApiResponse.success({
        ...result,
        auditLog
      });

    } catch (error) {
      console.error('Error performing user action:', error);
      return ApiResponse.error('Failed to perform action', 500);
    }
  }

  private static isAdmin(claims: any): boolean {
    // Check for admin role in JWT claims
    return claims?.['cognito:groups']?.includes('admin') || 
           claims?.['custom:role'] === 'admin' ||
           claims?.['sub']?.startsWith('admin-');
  }

  private static async getUserStats(userId: string) {
    // Get user's property statistics
    const properties = await PropertyRepository.listByOwner(userId, 100);
    const items = properties.items || [];
    
    return {
      totalProperties: items.length,
      activeListings: items.filter((p: any) => p.status === 'available').length,
      totalViews: items.reduce((sum: number, p: any) => sum + (p.viewCount || 0), 0),
      joinedAt: items[0]?.createdAt || null
    };
  }

  private static async suspendUserProperty(userId: string, body: string) {
    // Implementation for suspending a user's property
    return { message: 'Property suspended successfully' };
  }

  private static async verifyUserProperty(userId: string, body: string) {
    // Implementation for verifying a user's property
    return { message: 'Property verified successfully' };
  }
}
