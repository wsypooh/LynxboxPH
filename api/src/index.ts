// src/index.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler as propertyHandler } from './handlers/properties/handler';
import { SignupHandler } from './handlers/signup/handler';
import { BuildingHandler } from './handlers/buildings/handler';
import { TenantHandler } from './handlers/tenants/handler';
import { InvoiceHandler } from './handlers/invoices/handler';
import { LedgerHandler } from './handlers/ledger/handler';
import { DocumentHandler } from './handlers/documents/handler';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('=== MAIN HANDLER DEBUG ===');
    console.log('Path:', event.path);
    console.log('HTTP Method:', event.httpMethod);
    console.log('Resource:', event.resource);
    console.log('Path Parameters:', event.pathParameters);
    console.log('==========================');

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '' };
    }

    if (event.path?.endsWith('/api/signup') && event.httpMethod === 'POST') {
      return await SignupHandler.signup(event);
    }

    if (event.path?.includes('/api/buildings')) {
      return await BuildingHandler.handle(event);
    }

    if (event.path?.includes('/api/tenants') && event.path?.includes('/invoices')) {
      return await InvoiceHandler.handle(event);
    }

    if (event.path?.includes('/api/tenants') && event.path?.includes('/ledger')) {
      return await LedgerHandler.handle(event);
    }

    if (event.path?.includes('/api/tenants') && event.path?.includes('/payments')) {
      return await LedgerHandler.handle(event);
    }

    if (event.path?.includes('/api/tenants')) {
      return await TenantHandler.handle(event);
    }

    if (event.path?.includes('/api/invoices')) {
      return await InvoiceHandler.handle(event);
    }

    if (event.path?.includes('/api/ledger')) {
      return await LedgerHandler.handle(event);
    }

    if (event.path?.includes('/api/documents')) {
      return await DocumentHandler.handle(event);
    }

    return await propertyHandler(event);

  } catch (error) {
    console.error('Main handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
