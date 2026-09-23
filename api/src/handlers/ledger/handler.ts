import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LedgerRepository, pendingPenalty } from '../../repositories/ledgerRepository';
import { TenantRepository } from '../../repositories/tenantRepository';
import { ApiResponse } from '../../lib/apiResponse';
import { Actor, canDestroy, canWrite, resolveActor } from '../../lib/auth';

function getTenantId(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/tenants\/([^/]+)/);
  return match ? match[1] : null;
}

export class LedgerHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;
    const actor = await resolveActor(event);
    if (!actor) return ApiResponse.unauthorized('Not authenticated');

    try {
      if (method === 'POST' && path.match(/\/api\/tenants\/[^/]+\/ledger\/reset$/)) {
        if (!canDestroy(actor)) return ApiResponse.forbidden('You do not have permission to reset the ledger');
        return await LedgerHandler.resetLedger(event, actor);
      } else if (method === 'GET' && path.match(/\/api\/tenants\/[^/]+\/ledger$/)) {
        return await LedgerHandler.getLedger(event, actor);
      } else if (method === 'POST' && path.match(/\/api\/tenants\/[^/]+\/payments$/)) {
        if (!canWrite(actor)) return ApiResponse.forbidden('You do not have permission to record payments');
        return await LedgerHandler.recordPayment(event, actor);
      } else if (method === 'POST' && path.endsWith('/api/ledger/charges')) {
        if (!canWrite(actor)) return ApiResponse.forbidden('You do not have permission to create charges');
        return await LedgerHandler.createCharge(event, actor);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('LedgerHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async createCharge(event: APIGatewayProxyEvent, actor: Actor) {
    const body = JSON.parse(event.body || '{}');
    const { tenantId, billingMonth, principalAmount } = body;
    if (!tenantId || !billingMonth || !principalAmount) {
      return ApiResponse.error('tenantId, billingMonth, and principalAmount are required');
    }

    const tenant = await TenantRepository.findById(tenantId);
    if (!tenant || tenant.ownerId !== actor.accountId) return ApiResponse.notFound('Tenant not found');

    const chargeEntry = await LedgerRepository.createChargeEntry({
      tenantId,
      ownerId: actor.accountId,
      billingMonth,
      principalAmount,
      invoiceNumber: body.invoiceNumber,
      description: body.description || `Imported balance — ${billingMonth}`,
      source: 'import',
    });
    return ApiResponse.success({ chargeEntry }, 201);
  }

  static async getLedger(event: APIGatewayProxyEvent, actor: Actor) {
    const tenantId = getTenantId(event);
    if (!tenantId) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(tenantId);
    if (!tenant || tenant.ownerId !== actor.accountId) return ApiResponse.notFound('Tenant not found');

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

  static async recordPayment(event: APIGatewayProxyEvent, actor: Actor) {
    const tenantId = getTenantId(event);
    if (!tenantId) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(tenantId);
    if (!tenant || tenant.ownerId !== actor.accountId) return ApiResponse.notFound('Tenant not found');

    const body = JSON.parse(event.body || '{}');
    if (!body.amount || body.amount <= 0) return ApiResponse.error('amount must be a positive number');
    if (!body.paymentMethod) return ApiResponse.error('paymentMethod is required');

    const paymentEntry = await LedgerRepository.recordPaymentWithFIFO({
      tenantId,
      ownerId: actor.accountId,
      paymentDate: body.date || new Date().toISOString().slice(0, 10),
      totalAmount: body.amount,
      paymentMethod: body.paymentMethod,
      note: body.note,
      appliedTo: [],
    });
    return ApiResponse.success({ paymentEntry }, 201);
  }

  static async resetLedger(event: APIGatewayProxyEvent, actor: Actor) {
    const tenantId = getTenantId(event);
    if (!tenantId) return ApiResponse.notFound('Tenant not found');
    const tenant = await TenantRepository.findById(tenantId);
    if (!tenant || tenant.ownerId !== actor.accountId) return ApiResponse.notFound('Tenant not found');

    const result = await LedgerRepository.resetTenantLedger(tenantId);
    return ApiResponse.success(result);
  }
}
