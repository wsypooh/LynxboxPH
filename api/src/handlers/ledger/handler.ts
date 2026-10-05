import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LedgerRepository, pendingPenalty, DEFAULT_PENALTY_RATE } from '../../repositories/ledgerRepository';
import { TenantRepository } from '../../repositories/tenantRepository';
import { BuildingRepository } from '../../repositories/buildingRepository';
import { InvoiceRepository } from '../../repositories/invoiceRepository';
import { PaymentEntry } from '../../models/ledgerEntry';
import { ApiResponse } from '../../lib/apiResponse';
import { Actor, canDestroy, canWrite, resolveActor } from '../../lib/auth';

function getTenantId(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/tenants\/([^/]+)/);
  return match ? match[1] : null;
}

function getPaymentId(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/tenants\/[^/]+\/payments\/([^/]+)/);
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
      } else if (method === 'PUT' && path.match(/\/api\/tenants\/[^/]+\/payments\/[^/]+$/)) {
        // Owner-only, unlike recording a payment (canWrite) -- this corrects an already-applied
        // payment's method/note after the fact, not a normal day-to-day data-entry action.
        if (!canDestroy(actor)) return ApiResponse.forbidden('You do not have permission to edit payments');
        return await LedgerHandler.editPayment(event, actor);
      } else if (method === 'POST' && path.match(/\/api\/tenants\/[^/]+\/payments\/[^/]+\/void$/)) {
        if (!canDestroy(actor)) return ApiResponse.forbidden('You do not have permission to void payments');
        return await LedgerHandler.voidPayment(event, actor);
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
      importedPenalty: body.penaltyAmount != null ? Number(body.penaltyAmount) : undefined,
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

    const building = await BuildingRepository.findById(tenant.buildingId);
    const penaltyRate = building?.penaltyRate ?? DEFAULT_PENALTY_RATE;
    const penaltyEnabled = tenant.penaltyEnabled ?? true;
    const asOf = event.queryStringParameters?.asOf;
    const currentBillingMonth = asOf && /^\d{4}-\d{2}$/.test(asOf) ? asOf : new Date().toISOString().slice(0, 7);

    const [charges, payments, { previousBalance, previousBalanceHistory }] = await Promise.all([
      LedgerRepository.listChargesByTenant(tenantId),
      LedgerRepository.listPaymentsByTenant(tenantId),
      LedgerRepository.getLedgerSummary(tenantId, currentBillingMonth, penaltyEnabled, penaltyRate),
    ]);

    const chargesWithPenalty = charges.map(c => ({
      ...c,
      pendingPenalty: penaltyEnabled ? pendingPenalty(c, currentBillingMonth, penaltyRate) : 0,
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

    const building = await BuildingRepository.findById(tenant.buildingId);
    const penaltyRate = building?.penaltyRate ?? DEFAULT_PENALTY_RATE;
    const penaltyEnabled = tenant.penaltyEnabled ?? true;

    const paymentEntry = await LedgerRepository.recordPaymentWithFIFO({
      tenantId,
      ownerId: actor.accountId,
      paymentDate: body.date || new Date().toISOString().slice(0, 10),
      totalAmount: body.amount,
      paymentMethod: body.paymentMethod,
      note: body.note,
      appliedTo: [],
    }, penaltyEnabled, penaltyRate);
    return ApiResponse.success({ paymentEntry }, 201);
  }

  static async editPayment(event: APIGatewayProxyEvent, actor: Actor) {
    const tenantId = getTenantId(event);
    const paymentId = getPaymentId(event);
    if (!tenantId || !paymentId) return ApiResponse.notFound('Payment not found');
    const tenant = await TenantRepository.findById(tenantId);
    if (!tenant || tenant.ownerId !== actor.accountId) return ApiResponse.notFound('Tenant not found');

    const payment = await LedgerRepository.findPaymentById(paymentId);
    if (!payment || payment.tenantId !== tenantId || payment.deletedAt) return ApiResponse.notFound('Payment not found');

    const body = JSON.parse(event.body || '{}');
    // Only descriptive fields are editable after the fact. amount/date/appliedTo carry real
    // side effects (FIFO allocation, penalty math) and would need the whole ledger re-run to
    // change safely -- deliberately not exposed here.
    const updates: Partial<PaymentEntry> = {};
    if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
    if (body.note !== undefined) updates.note = body.note;
    if (Object.keys(updates).length === 0) return ApiResponse.error('Nothing to update');

    const updated = await LedgerRepository.updatePaymentEntry(paymentId, updates);
    if (!updated) return ApiResponse.notFound('Payment not found');

    // Invoice.paymentsReceived is a frozen snapshot copied onto each invoice at creation time
    // (InvoiceHandler.getPaymentsReceivedSinceLastInvoice) -- without this sync, this edit would
    // never show up on an already-generated Statement of Account/PDF, which defeats the purpose.
    const tenantInvoices = await InvoiceRepository.listByTenant(tenantId);
    await Promise.all(
      tenantInvoices
        .filter(inv => inv.paymentsReceived?.some(p => p.paymentEntryId === paymentId))
        .map(inv => InvoiceRepository.update(inv.id, {
          paymentsReceived: inv.paymentsReceived!.map(p =>
            p.paymentEntryId === paymentId
              ? { ...p, paymentMethod: updated.paymentMethod, note: updated.note }
              : p
          ),
        }))
    );

    return ApiResponse.success({ paymentEntry: updated });
  }

  static async voidPayment(event: APIGatewayProxyEvent, actor: Actor) {
    const tenantId = getTenantId(event);
    const paymentId = getPaymentId(event);
    if (!tenantId || !paymentId) return ApiResponse.notFound('Payment not found');
    const tenant = await TenantRepository.findById(tenantId);
    if (!tenant || tenant.ownerId !== actor.accountId) return ApiResponse.notFound('Tenant not found');

    const payment = await LedgerRepository.findPaymentById(paymentId);
    if (!payment || payment.tenantId !== tenantId || payment.deletedAt) return ApiResponse.notFound('Payment not found');

    const voided = await LedgerRepository.voidPaymentEntry(paymentId);
    if (!voided) return ApiResponse.error('Failed to void payment', 500);

    // Same reasoning as editPayment's sync -- a voided payment must be removed from any
    // invoice's frozen paymentsReceived snapshot too, or an already-generated Statement/PDF
    // would keep showing money that's no longer real.
    const tenantInvoices = await InvoiceRepository.listByTenant(tenantId);
    await Promise.all(
      tenantInvoices
        .filter(inv => inv.paymentsReceived?.some(p => p.paymentEntryId === paymentId))
        .map(inv => InvoiceRepository.update(inv.id, {
          paymentsReceived: inv.paymentsReceived!.filter(p => p.paymentEntryId !== paymentId),
        }))
    );

    return ApiResponse.success({ paymentEntry: voided });
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
