// src/index.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler as propertyHandler } from './handlers/properties/handler';
import { SignupHandler } from './handlers/signup/handler';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Debug logging
    console.log('=== MAIN HANDLER DEBUG ===');
    console.log('Path:', event.path);
    console.log('HTTP Method:', event.httpMethod);
    console.log('Resource:', event.resource);
    console.log('Path Parameters:', event.pathParameters);
    console.log('==========================');
    
    // Route signup requests - handle both with and without stage prefix
    if ((event.path?.endsWith('/api/signup')) && event.httpMethod === 'POST') {
      console.log('Routing to SignupHandler.signup()');
      return await SignupHandler.signup(event);
    }
    
    // Route all other requests to the property handler
    console.log('Routing to property handler');
    return await propertyHandler(event);
    
  } catch (error) {
    console.error('Main handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}
