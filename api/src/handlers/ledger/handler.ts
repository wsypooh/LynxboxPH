import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LedgerRepository, pendingPenalty } from '../../repositories/ledgerRepository';
import { TenantRepository } from '../../repositories/tenantRepository';
import { ApiResponse } from '../../lib/apiResponse';

function getUserId(event: APIGatewayProxyEvent): string | null {
  return event.requestContext.authorizer?.claims?.sub
    || event.requestContext.authorizer?.claims?.['cognito:username']
    || (process.env.IS_OFFLINE ? 'local-test-user-123' : null);
}

function getTenantId(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/tenants\/([^/]+)/);
  return match ? match[1] : null;
}

export class LedgerHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;
    const userId = getUserId(event);
    if (!userId) return ApiResponse.unauthorized('Not authenticated');

    try {
      if (method === 'POST' && path.match(/\/api\/tenants\/[^/]+\/ledger\/reset$/)) {
        return await LedgerHandler.resetLedger(event, userId);
      } else if (method === 'GET' && path.match(/\/api\/tenants\/[^/]+\/ledger$/)) {
        return await LedgerHandler.getLedger(event, userId);
      } else if (method === 'POST' && path.match(/\/api\/tenants\/[^/]+\/payments$/)) {
        return await LedgerHandler.recordPayment(event, userId);
      } else if (method === 'POST' && path.endsWith('/api/ledger/charges')) {
        return await LedgerHandler.createCharge(event, userId);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('LedgerHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async createCharge(event: APIGatewayProxyEvent, userId: string) {
    const body = JSON.parse(event.body || '{}');
    const { tenantId, billingMonth, principalAmount } = body;
    if (!tenantId || !billingMonth || !principalAmount) {
      return ApiResponse.error('tenantId, billingMonth, and principalAmount are required');
    }

    const tenant = await TenantRepository.findById(tenantId);
    if (!tenant || tenant.ownerId !== userId) return ApiResponse.notFound('Tenant not found');

    const chargeEntry = await LedgerRepository.createChargeEntry({
      tenantId,
      ownerId: userId,
      billingMonth,
      principalAmount,
      invoiceNumber: body.invoiceNumber,
      description: body.description || `Imported balance — ${billingMonth}`,
      source: 'import',
    });
    return ApiResponse.success({ chargeEntry }, 201);
  }

  static async getLedger(event: APIGatewayProxyEvent, userId: string) {
    const tenantId = getTenantId(event);
    if (!tenantId) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(tenantId);
    if (!tenant || tenant.ownerId !== userId) return ApiResponse.notFound('Tenant not found');

    const penaltyEnabled = tenant.penaltyEnabled ?? true;
    const asOf = event.queryStringParameters?.asOf;
    const currentBillingMonth = asOf && /^\d{4}-\d{2}$/.test(asOf) ? asOf : new Date().toISOString().slice(0, 7);

    const [charges, payments, { previousBalance, previousBalanceHistory }] = await Promise.all([
      LedgerRepository.listChargesByTenant(tenantId),
      LedgerRepository.listPaymentsByTenant(tenantId),
      LedgerRepository.getLedgerSummary(tenantId, currentBillingMonth, penaltyEnabled),
    ]);

    const chargesWithPenalty = charges.map(c => ({
      ...c,
      pendingPenalty: penaltyEnabled ? pendingPenalty(c, currentBillingMonth) : 0,
    }));

    return ApiResponse.success({
      charges: chargesWithPenalty, payments, previousBalance, previousBalanceHistory,
      asOf: currentBillingMonth,
    });
  }

  static async recordPayment(event: APIGatewayProxyEvent, userId: string) {
    const tenantId = getTenantId(event);
    if (!tenantId) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(tenantId);
    if (!tenant || tenant.ownerId !== userId) return ApiResponse.notFound('Tenant not found');

    const body = JSON.parse(event.body || '{}');
    if (!body.amount || body.amount <= 0) return ApiResponse.error('amount must be a positive number');
    if (!body.paymentMethod) return ApiResponse.error('paymentMethod is required');

    const paymentEntry = await LedgerRepository.recordPaymentWithFIFO({
      tenantId,
      ownerId: userId,
      paymentDate: body.date || new Date().toISOString().slice(0, 10),
      totalAmount: body.amount,
      paymentMethod: body.paymentMethod,
      note: body.note,
      appliedTo: [],
    });
    return ApiResponse.success({ paymentEntry }, 201);
  }

  static async resetLedger(event: APIGatewayProxyEvent, userId: string) {
    const tenantId = getTenantId(event);
    if (!tenantId) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(tenantId);
    if (!tenant || tenant.ownerId !== userId) return ApiResponse.notFound('Tenant not found');

    const result = await LedgerRepository.resetTenantLedger(tenantId);
    return ApiResponse.success(result);
  }
}
