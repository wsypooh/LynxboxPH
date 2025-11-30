# JWT Authentication Implementation

## Overview

This document describes the JWT authentication implementation for the ListSpace PH application. The system uses AWS Cognito for authentication and JWT tokens for securing API endpoints.

## Architecture

### Backend (API Gateway + Lambda)

1. **JWT Authorizer Configuration**
   - Configured in `serverless.yml` with HTTP API JWT authorizer
   - Uses Cognito User Pool client ID and issuer URL
   - Automatically validates JWT tokens on protected endpoints

2. **Protected Endpoints**
   - `/api/properties/*` (except public endpoints)
   - `/api/properties/{id}/images/*`
   - All user-specific operations

3. **Public Endpoints**
   - `/api/public/properties` - Public property listings
   - `/api/properties/search` - Property search (public)

### Frontend (Next.js + AWS Amplify)

1. **Token Management**
   - `src/lib/auth.ts` - JWT token utilities
   - Automatic token retrieval from AWS Amplify
   - Token injection into API request headers

2. **Service Layer**
   - `PropertyService` updated with authentication support
   - Automatic JWT token inclusion for protected endpoints
   - Separate handling for public vs private endpoints

## Implementation Details

### Backend Changes

#### serverless.yml
```yaml
httpApi:
  authorizers:
    ApiGatewayAuthorizer:
      type: jwt
      identitySource:
        - $request.header.Authorization
      jwtConfiguration:
        audience:
          - ${env:COGNITO_USER_POOL_CLIENT_ID}
        issuer:
          - ${env:COGNITO_USER_POOL_ISSUER}
```

#### Protected Endpoints
All user-specific endpoints now require JWT authentication:
```yaml
- http:
    path: /api/properties
    method: get
    cors: true
    authorizer:
      name: ApiGatewayAuthorizer
      type: request
```

### Frontend Changes

#### JWT Token Utilities (`src/lib/auth.ts`)
```typescript
import { fetchAuthSession, type AuthSession } from 'aws-amplify/auth'

export async function getCurrentJWTToken(): Promise<string | null> {
  try {
    const session: AuthSession = await fetchAuthSession()
    return session.tokens?.accessToken?.toString() || null
  } catch (error) {
    console.error('Error fetching JWT token:', error)
    return null
  }
}
```

#### Service Layer Updates
```typescript
private async request<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = true
): Promise<T> {
  const authHeaders = requireAuth ? await getAuthHeaders() : {};
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  };
  // ... rest of implementation
}
```

## Environment Variables

Required environment variables for JWT authentication:

### Backend
- `COGNITO_USER_POOL_CLIENT_ID` - Cognito User Pool App Client ID
- `COGNITO_USER_POOL_ISSUER` - Cognito User Pool issuer URL

### Frontend
- `NEXT_PUBLIC_API_URL` - API Gateway endpoint URL

## API Endpoint Security

### Authenticated Endpoints (Require JWT)
- `GET /api/properties` - List user's properties
- `POST /api/properties` - Create property
- `GET /api/properties/{id}` - Get specific property
- `PUT /api/properties/{id}` - Update property
- `DELETE /api/properties/{id}` - Delete property
- `GET /api/properties/{id}/images/upload-url` - Get upload URL
- `GET /api/properties/{id}/images/view-url` - Get view URL

### Public Endpoints (No Authentication Required)
- `GET /api/public/properties` - List all available properties
- `GET /api/public/search` - Search available properties (public)

### Protected Search Endpoints (Require JWT)
- `GET /api/properties/search` - Search user's own properties (authenticated)

## Dual Search Endpoint Architecture

### Security Issue Addressed
The original implementation had a critical security vulnerability where `/api/properties/search` exposed **all users' private properties** to anyone without authentication.

### Solution: Dual Endpoints

#### 1. Public Search (`/api/public/search`)
- **Purpose**: Public property discovery and browsing
- **Authentication**: None required
- **Scope**: Only searches properties with `status = 'available'`
- **Use Cases**: 
  - Website public search functionality
  - Property discovery for potential renters/buyers
  - General browsing without login

#### 2. Protected Search (`/api/properties/search`)
- **Purpose**: User's personal property management
- **Authentication**: JWT token required
- **Scope**: Only searches authenticated user's own properties
- **Use Cases**:
  - User dashboard search
  - Personal property management
  - User-specific property filtering

### Frontend Service Methods

#### Public Search Methods
```typescript
// Public search - no authentication
propertyService.searchProperties(query, limit)
propertyService.filterProperties(filters)
propertyService.listPublicProperties(params)
```

#### Protected Search Methods
```typescript
// User-specific search - requires authentication
propertyService.searchUserProperties(query, limit)
propertyService.listProperties(params)  // User's properties only
```

### Backend Implementation

#### Repository Filter Enhancement
```typescript
static async filter(filters: {
  // ... existing filters
  ownerId?: string;  // For user-specific filtering
  status?: string;   // For status filtering (e.g., 'available')
}): Promise<Property[]>
```

#### Handler Updates
- **`searchPublicProperties()`**: Public endpoint, filters by `status = 'available'`
- **`searchProperties()`**: Protected endpoint, filters by `ownerId` from JWT claims

### Security Benefits
1. **Zero Data Leakage**: Private properties remain private
2. **Proper Access Control**: Server-side filtering by user ID
3. **Public Functionality**: Maintains open property discovery
4. **User Privacy**: Personal data protected behind authentication

## User Authentication Flow

1. **User Login** - Through AWS Amplify UI
2. **Token Retrieval** - JWT token automatically stored by Amplify
3. **API Requests** - Token automatically included in Authorization header
4. **Backend Validation** - API Gateway validates JWT before Lambda execution
5. **User Context** - Lambda extracts user ID from JWT claims

## Development vs Production

### Development
- `serverless-offline` with `noAuth: true` for local testing
- Fallback user IDs in Lambda handlers for local development
- AuthTest component provides visual feedback during development

### Production
- Full JWT validation through API Gateway
- No fallback mechanisms - authentication required
- Automatic user identification from JWT claims

## Testing

### AuthTest Component
The `AuthTest` component provides comprehensive testing of the JWT authentication flow:

1. User authentication verification
2. JWT token retrieval and validation
3. User ID extraction from JWT
4. Authenticated API call testing
5. Public API call testing
6. **Public search API call testing**
7. **User search API call testing**

### Manual Testing Steps

1. **Start the application**
2. **Login with a valid user**
3. **Check the AuthTest overlay** (development mode only)
4. **Verify all tests pass**
5. **Test property CRUD operations**

## Error Handling

### JWT Token Errors
- Automatic token refresh by AWS Amplify
- Graceful fallback to re-authentication
- Clear error messages for users

### API Errors
- 401 Unauthorized for missing/invalid tokens
- 403 Forbidden for insufficient permissions
- Detailed error responses for debugging

## Security Considerations

1. **Token Storage** - AWS Amplify handles secure token storage
2. **Token Transmission** - HTTPS only for production
3. **Token Validation** - API Gateway validates before Lambda execution
4. **User Context** - Server-side user identification prevents data leakage
5. **Development Safety** - Auth disabled only in local development
6. **Dual Endpoint Security** - Separate public and protected search endpoints prevent data leakage
7. **Zero-Trust Architecture** - All user data requires explicit authentication

## Troubleshooting

### Common Issues

1. **"User authentication required" error**
   - Check if user is logged in
   - Verify JWT token is present
   - Check token expiration

2. **CORS errors**
   - Verify CORS configuration in serverless.yml
   - Check API Gateway CORS settings

3. **"Invalid token" errors**
   - Verify Cognito User Pool configuration
   - Check client ID and issuer URL
   - Ensure token format is correct

### Debug Steps

1. Check browser console for AuthTest results
2. Verify AWS Amplify configuration
3. Check API Gateway logs
4. Verify Lambda function logs
5. Test with Postman/Insomnia using valid JWT token

## Migration Notes

This implementation maintains backward compatibility:

- Existing API endpoints continue to work
- Public endpoints remain accessible without authentication
- User-specific endpoints now properly secured
- Development workflow unchanged with local fallbacks

The migration to JWT authentication enhances security while maintaining the existing user experience and development workflow.
