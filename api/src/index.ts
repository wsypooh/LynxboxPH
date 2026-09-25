// src/index.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler as propertyHandler } from './handlers/properties/handler';
import { SignupHandler } from './handlers/signup/handler';
import { BuildingHandler } from './handlers/buildings/handler';
import { TenantHandler } from './handlers/tenants/handler';
import { InvoiceHandler } from './handlers/invoices/handler';
import { LedgerHandler } from './handlers/ledger/handler';
import { DocumentHandler } from './handlers/documents/handler';
import { PlatformAdminDashboardHandler } from './handlers/platformAdmin/dashboardHandler';
import { PaymentVerificationHandler } from './handlers/platformAdmin/paymentVerificationHandler';
import { AccountHandler } from './handlers/account/handler';
import { BillingHandler } from './handlers/billing/handler';
import { PublicBillingHandler } from './handlers/publicBilling/handler';
import { PublicContactHandler } from './handlers/publicContact/handler';
import { SubscriptionCronHandler } from './handlers/subscriptionCron/handler';

export async function handler(event: any): Promise<APIGatewayProxyResult> {
  try {
    // docs/Payments-and-Subscription-Plan.md — EventBridge invokes this same Lambda on a
    // daily schedule with a synthetic event (no path/httpMethod at all, per
    // infra/modules/api/cron.tf's `input`), so this must be checked before anything below
    // touches event.path/event.httpMethod.
    if (event.source === 'lynxboxph.scheduler' && event['detail-type'] === 'daily-subscription-check') {
      await SubscriptionCronHandler.processDaily();
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '' };
    }

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

    // Most-specific first: payment verification/promo-codes/trial-extension before the
    // generic platform-admin dashboard branch below.
    if (
      event.path?.includes('/api/platform-admin/payment-submissions') ||
      event.path?.includes('/api/platform-admin/promo-codes') ||
      (event.path?.includes('/api/platform-admin/accounts') && event.path?.includes('/extend-trial'))
    ) {
      return await PaymentVerificationHandler.handle(event);
    }

    if (event.path?.includes('/api/platform-admin')) {
      return await PlatformAdminDashboardHandler.handle(event);
    }

    if (event.path?.includes('/api/account')) {
      return await AccountHandler.handle(event);
    }

    if (event.path?.includes('/api/billing')) {
      return await BillingHandler.handle(event);
    }

    if (event.path?.includes('/api/public/promo-codes')) {
      return await PublicBillingHandler.handle(event);
    }

    if (event.path?.includes('/api/public/contact')) {
      return await PublicContactHandler.handle(event);
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
