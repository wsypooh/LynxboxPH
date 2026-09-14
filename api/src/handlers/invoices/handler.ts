import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { InvoiceRepository } from '../../repositories/invoiceRepository';
import { Invoice } from '../../models/invoice';
import { TenantRepository } from '../../repositories/tenantRepository';
import { BuildingRepository } from '../../repositories/buildingRepository';
import { PdfService } from '../../lib/pdf';
import { ZeptoMailService } from '../../lib/zeptomail';
import { ApiResponse } from '../../lib/apiResponse';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require('archiver') as (format: string, options?: any) => any;
import { Writable } from 'stream';
import { PDFDocument } from 'pdf-lib';

function getUserId(event: APIGatewayProxyEvent): string | null {
  return event.requestContext.authorizer?.claims?.sub
    || event.requestContext.authorizer?.claims?.['cognito:username']
    || (process.env.IS_OFFLINE ? 'local-test-user-123' : null);
}

function getUserDisplayName(event: APIGatewayProxyEvent): string {
  const claims = event.requestContext.authorizer?.claims;
  return claims?.name
    || claims?.email
    || claims?.['cognito:username']
    || (process.env.IS_OFFLINE ? 'Local User' : 'Unknown');
}

function getInvoiceId(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/invoices\/([^/]+)/);
  return match ? match[1] : null;
}

function getBillingLabel(billingMonth: string): string {
  const [year, month] = billingMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
}

const mailer = new ZeptoMailService();

export class InvoiceHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;
    const userId = getUserId(event);
    if (!userId) return ApiResponse.unauthorized('Not authenticated');

    try {
      if (method === 'POST' && path.match(/\/api\/invoices\/batch-pdf$/)) {
        return await InvoiceHandler.downloadBatchPdfByIds(event, userId);
      } else if (method === 'GET' && path.match(/\/api\/invoices\/batch-pdf$/)) {
        return await InvoiceHandler.downloadBatchPdf(event, userId);
      } else if (method === 'POST' && path.match(/\/api\/invoices\/[^/]+\/payments$/)) {
        return await InvoiceHandler.recordPayment(event, userId);
      } else if (method === 'POST' && path.match(/\/api\/invoices\/[^/]+\/send$/)) {
        return await InvoiceHandler.sendInvoice(event, userId);
      } else if (method === 'POST' && path.match(/\/api\/invoices\/[^/]+\/rollover$/)) {
        return await InvoiceHandler.rolloverInvoice(event, userId);
      } else if (method === 'GET' && path.match(/\/api\/invoices\/[^/]+\/pdf$/)) {
        return await InvoiceHandler.downloadPdf(event, userId);
      } else if (method === 'GET' && path.match(/\/api\/invoices\/[^/]+$/) && !path.endsWith('/api/invoices')) {
        return await InvoiceHandler.getInvoice(event, userId);
      } else if (method === 'PUT' && path.match(/\/api\/invoices\/[^/]+$/)) {
        return await InvoiceHandler.updateInvoice(event, userId);
      } else if (method === 'DELETE' && path.match(/\/api\/invoices\/[^/]+$/)) {
        return await InvoiceHandler.deleteInvoice(event, userId);
      } else if (method === 'GET' && path.endsWith('/api/invoices')) {
        return await InvoiceHandler.listInvoices(event, userId);
      } else if (method === 'POST' && path.endsWith('/api/invoices')) {
        return await InvoiceHandler.createInvoice(event, userId);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('InvoiceHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async listInvoices(event: APIGatewayProxyEvent, userId: string) {
    const { tenantId, billingMonth, status } = event.queryStringParameters || {};
    let invoices;
    if (tenantId) {
      const tenant = await TenantRepository.findById(tenantId);
      if (!tenant || tenant.ownerId !== userId) return ApiResponse.notFound('Tenant not found');
      invoices = await InvoiceRepository.listByTenant(tenantId);
    } else {
      const tenants = await TenantRepository.listByOwner(userId);
      const ids = tenants.map(t => t.id);
      invoices = await InvoiceRepository.listByOwner(userId, ids);
    }
    if (billingMonth) invoices = invoices.filter(i => i.billingMonth === billingMonth);
    if (status) invoices = invoices.filter(i => i.status === status);
    return ApiResponse.success({ invoices });
  }

  static async createInvoice(event: APIGatewayProxyEvent, userId: string) {
    const body = JSON.parse(event.body || '{}');
    const { tenantId, billingMonth } = body;
    if (!tenantId || !billingMonth) return ApiResponse.error('tenantId and billingMonth are required');

    const tenant = await TenantRepository.findById(tenantId);
    if (!tenant || tenant.ownerId !== userId) return ApiResponse.notFound('Tenant not found');

    const building = await BuildingRepository.findById(tenant.buildingId);
    if (!building) return ApiResponse.notFound('Building not found');

    const billingLabel = getBillingLabel(billingMonth);
    const unpaid = await InvoiceRepository.getUnpaidByTenant(tenantId);
    const penaltyRate = (tenant.penaltyEnabled ?? true) ? building.penaltyRate : 0;
    const previousBalanceHistory = unpaid.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      billingMonth: inv.billingMonth,
      billingLabel: inv.billingLabel,
      amountDue: inv.totalDue,
      amountPaid: inv.amountPaid,
      outstanding: inv.outstanding,
      penalty: inv.outstanding * penaltyRate,
    }));
    const previousBalance = previousBalanceHistory.reduce((s, e) => s + e.outstanding + e.penalty, 0);

    const vatRate = building.vatRate ?? 0.12;
    const withholdingTaxRate = building.withholdingTaxRate ?? 0.05;
    const rent = body.rent ?? tenant.defaultRent;
    const vat = body.vat ?? (tenant.vatEnabled ? rent * vatRate : 0);
    const withholdingTax = body.withholdingTax ?? (tenant.withholdingTaxEnabled ? rent * withholdingTaxRate : 0);

    const electricityMode = tenant.electricityMode ?? 'metered';
    let electricity;
    if (electricityMode === 'direct') {
      electricity = { mode: 'direct' as const, presentReading: 0, previousReading: 0, rate: 0, amount: 0 };
    } else {
      const electricityRate = body.electricity?.rate ?? building.currentElectricityRate;
      const elecPresent = body.electricity?.presentReading ?? 0;
      const elecPrevious = body.electricity?.previousReading ?? 0;
      electricity = { mode: 'metered' as const, presentReading: elecPresent, previousReading: elecPrevious, rate: electricityRate, amount: Math.max(0, (elecPresent - elecPrevious) * electricityRate) };
    }

    let water;
    if (tenant.waterMode === 'direct') {
      water = { mode: 'direct' as const, amount: 0 };
    } else {
      water = body.water ?? {
        mode: tenant.waterMode,
        amount: tenant.waterMode === 'fixed' ? (tenant.defaultFixedWater ?? building.defaultFixedWaterAmount ?? 0) : 0,
      };
      if (water.mode === 'metered' && water.presentReading !== undefined && water.previousReading !== undefined) {
        water.amount = Math.max(0, (water.presentReading - water.previousReading) * (water.rate ?? building.waterRate ?? 0));
      }
    }

    const invoiceData = {
      ownerId: userId,
      tenantId,
      buildingId: tenant.buildingId,
      buildingName: building.name,
      buildingAddress: building.address,
      buildingPhone: building.phone,
      buildingEmail: building.email,
      tenantCode: tenant.tenantCode,
      lesseeName: tenant.lesseeName,
      floor: tenant.floor,
      roomNumber: tenant.roomNumber,
      billingMonth,
      billingLabel,
      rent,
      vat,
      withholdingTax,
      water,
      electricity,
      guard: body.guard ?? tenant.defaultGuard ?? 0,
      otherCharges: body.otherCharges ?? [],
      discount: body.discount ?? 0,
      previousBalance,
      previousBalanceHistory,
    };

    const invoice = await InvoiceRepository.create(invoiceData);
    return ApiResponse.success({ invoice }, 201);
  }

  private static async enrichInvoice(invoice: Invoice) {
    const [building, tenant] = await Promise.all([
      BuildingRepository.findById(invoice.buildingId),
      TenantRepository.findById(invoice.tenantId),
    ]);
    return {
      ...invoice,
      buildingName: building?.name ?? invoice.buildingName,
      buildingAddress: building?.address ?? invoice.buildingAddress,
      buildingPhone: building?.phone ?? invoice.buildingPhone,
      buildingEmail: building?.email ?? invoice.buildingEmail,
      lesseeName: tenant?.lesseeName ?? invoice.lesseeName,
      tenantCode: tenant?.tenantCode ?? invoice.tenantCode,
    };
  }

  static async getInvoice(event: APIGatewayProxyEvent, userId: string) {
    const id = getInvoiceId(event);
    if (!id) return ApiResponse.notFound('Invoice not found');
    const invoice = await InvoiceRepository.findById(id);
    if (!invoice || invoice.ownerId !== userId || invoice.deletedAt) return ApiResponse.notFound('Invoice not found');
    return ApiResponse.success({ invoice: await InvoiceHandler.enrichInvoice(invoice) });
  }

  static async updateInvoice(event: APIGatewayProxyEvent, userId: string) {
    const id = getInvoiceId(event);
    if (!id) return ApiResponse.notFound('Invoice not found');
    const invoice = await InvoiceRepository.findById(id);
    if (!invoice || invoice.ownerId !== userId || invoice.deletedAt) return ApiResponse.notFound('Invoice not found');
    const body = JSON.parse(event.body || '{}');

    // Only draft invoices can have content edited; other statuses allow status-only changes
    const isStatusOnly = Object.keys(body).every(k => k === 'status');
    if (invoice.status !== 'draft' && !isStatusOnly) {
      return ApiResponse.error('Only draft invoices can be edited.', 400);
    }

    // Recompute totals if charges changed
    const rent = body.rent ?? invoice.rent;
    const vat = body.vat ?? invoice.vat;
    const wt = Math.abs(body.withholdingTax ?? invoice.withholdingTax ?? 0);
    const subtotal = rent + vat - wt;
    const water = body.water ?? invoice.water;
    const elec = body.electricity ?? invoice.electricity;
    const guard = body.guard ?? invoice.guard;
    const otherCharges = body.otherCharges ?? invoice.otherCharges;
    const discount = body.discount ?? invoice.discount;
    const currentChargesTotal = subtotal + (water.amount ?? 0) + (elec.amount ?? 0) + guard + otherCharges.reduce((s: number, c: any) => s + c.amount, 0) - discount;
    const previousBalance = body.previousBalance ?? invoice.previousBalance;
    const totalDue = currentChargesTotal + previousBalance;
    const outstanding = totalDue - invoice.amountPaid;
    const status = outstanding <= 0 ? 'paid' : invoice.amountPaid > 0 ? 'partial' : (body.status ?? invoice.status);

    // Append status change to history if status changed
    const statusHistory = invoice.statusHistory ?? [];
    if (status !== invoice.status) {
      statusHistory.push({ from: invoice.status, to: status, changedAt: new Date().toISOString(), changedBy: getUserDisplayName(event) });
    }

    const updated = (await InvoiceRepository.update(id, {
      ...body, subtotal, currentChargesTotal, totalDue, outstanding, status, statusHistory,
    }))!;
    return ApiResponse.success({ invoice: await InvoiceHandler.enrichInvoice(updated) });
  }

  static async deleteInvoice(event: APIGatewayProxyEvent, userId: string) {
    const id = getInvoiceId(event);
    if (!id) return ApiResponse.notFound('Invoice not found');
    const invoice = await InvoiceRepository.findById(id);
    if (!invoice || invoice.ownerId !== userId || invoice.deletedAt) return ApiResponse.notFound('Invoice not found');
    await InvoiceRepository.delete(id);
    return ApiResponse.success({ message: 'Deleted' });
  }

  static async recordPayment(event: APIGatewayProxyEvent, userId: string) {
    const id = getInvoiceId(event);
    if (!id) return ApiResponse.notFound('Invoice not found');
    const invoice = await InvoiceRepository.findById(id);
    if (!invoice || invoice.ownerId !== userId) return ApiResponse.notFound('Invoice not found');
    const body = JSON.parse(event.body || '{}');
    const payment = { date: body.date || new Date().toISOString(), amount: body.amount, paymentMethod: body.paymentMethod, note: body.note };
    const updated = (await InvoiceRepository.recordPayment(id, payment, getUserDisplayName(event)))!;
    return ApiResponse.success({ invoice: await InvoiceHandler.enrichInvoice(updated) });
  }

  static async sendInvoice(event: APIGatewayProxyEvent, userId: string) {
    const id = getInvoiceId(event);
    if (!id) return ApiResponse.notFound('Invoice not found');
    const invoice = await InvoiceRepository.findById(id);
    if (!invoice || invoice.ownerId !== userId) return ApiResponse.notFound('Invoice not found');

    const enriched = await InvoiceHandler.enrichInvoice(invoice);
    const pdfBuffer = await PdfService.generateInvoicePdf(enriched);
    await mailer.sendInvoiceEmail(enriched, pdfBuffer);
    const statusHistory = invoice.statusHistory ?? [];
    if (invoice.status !== 'sent') {
      statusHistory.push({ from: invoice.status, to: 'sent', changedAt: new Date().toISOString(), changedBy: getUserDisplayName(event) });
    }
    const updated = (await InvoiceRepository.update(id, { status: 'sent', statusHistory }))!;
    return ApiResponse.success({ invoice: await InvoiceHandler.enrichInvoice(updated) });
  }

  static async downloadPdf(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
    const id = getInvoiceId(event);
    if (!id) return ApiResponse.notFound('Invoice not found');
    const invoice = await InvoiceRepository.findById(id);
    if (!invoice || invoice.ownerId !== userId) return ApiResponse.notFound('Invoice not found');

    const enriched = await InvoiceHandler.enrichInvoice(invoice);
    const pdfBuffer = await PdfService.generateInvoicePdf(enriched);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.tenantCode}-${invoice.invoiceNumber}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  }

  static async rolloverInvoice(event: APIGatewayProxyEvent, userId: string) {
    const id = getInvoiceId(event);
    if (!id) return ApiResponse.notFound('Invoice not found');
    const invoice = await InvoiceRepository.findById(id);
    if (!invoice || invoice.ownerId !== userId) return ApiResponse.notFound('Invoice not found');

    // Compute next month
    const [year, month] = invoice.billingMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    const nextLabel = getBillingLabel(nextMonth);

    const [building, tenant] = await Promise.all([
      BuildingRepository.findById(invoice.buildingId),
      TenantRepository.findById(invoice.tenantId),
    ]);
    const electricityRate = building?.currentElectricityRate ?? invoice.electricity.rate;

    const unpaid = await InvoiceRepository.getUnpaidByTenant(invoice.tenantId);
    const rolloverPenaltyRate = (tenant?.penaltyEnabled ?? true) ? (building?.penaltyRate ?? 0.05) : 0;
    const previousBalanceHistory = unpaid.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      billingMonth: inv.billingMonth,
      billingLabel: inv.billingLabel,
      amountDue: inv.totalDue,
      amountPaid: inv.amountPaid,
      outstanding: inv.outstanding,
      penalty: inv.outstanding * rolloverPenaltyRate,
    }));
    const previousBalance = previousBalanceHistory.reduce((s, e) => s + e.outstanding + e.penalty, 0);

    const draftData = {
      ownerId: invoice.ownerId,
      tenantId: invoice.tenantId,
      buildingId: invoice.buildingId,
      buildingName: invoice.buildingName,
      buildingAddress: invoice.buildingAddress,
      buildingPhone: invoice.buildingPhone,
      buildingEmail: invoice.buildingEmail,
      tenantCode: invoice.tenantCode,
      lesseeName: invoice.lesseeName,
      floor: invoice.floor,
      roomNumber: invoice.roomNumber,
      billingMonth: nextMonth,
      billingLabel: nextLabel,
      rent: invoice.rent,
      vat: invoice.vat,
      withholdingTax: invoice.withholdingTax,
      water: invoice.water.mode === 'direct'
        ? { mode: 'direct' as const, amount: 0 }
        : { ...invoice.water, presentReading: 0, previousReading: invoice.water.presentReading ?? 0, amount: invoice.water.mode === 'fixed' ? invoice.water.amount : 0 },
      electricity: invoice.electricity.mode === 'direct'
        ? { mode: 'direct' as const, presentReading: 0, previousReading: 0, rate: 0, amount: 0 }
        : { mode: 'metered' as const, presentReading: 0, previousReading: invoice.electricity.presentReading, rate: electricityRate, amount: 0 },
      guard: invoice.guard,
      otherCharges: invoice.otherCharges,
      discount: invoice.discount,
      previousBalance,
      previousBalanceHistory,
    };

    return ApiResponse.success({ draft: draftData });
  }

  static async downloadBatchPdfByIds(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
    const body = JSON.parse(event.body || '{}');
    const ids: string[] = body.ids || [];
    if (ids.length === 0) return ApiResponse.error('No invoice IDs provided');

    const invoices = await Promise.all(ids.map(id => InvoiceRepository.findById(id)));
    const owned = invoices.filter(inv => inv && inv.ownerId === userId) as Invoice[];
    if (owned.length === 0) return ApiResponse.notFound('No matching invoices found');

    const enriched = await Promise.all(owned.map(inv => InvoiceHandler.enrichInvoice(inv)));
    const pdfBuffers = await Promise.all(enriched.map(inv => PdfService.generateInvoicePdf(inv)));

    // Merge all PDFs into one
    const merged = await PDFDocument.create();
    for (const buf of pdfBuffers) {
      const src = await PDFDocument.load(buf);
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }
    const mergedBytes = await merged.save();
    const mergedBuffer = Buffer.from(mergedBytes);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoices-selected.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: mergedBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  }

  static async downloadBatchPdf(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
    const billingMonth = event.queryStringParameters?.billingMonth;
    if (!billingMonth) return ApiResponse.error('billingMonth is required');

    const tenants = await TenantRepository.listByOwner(userId);
    const allInvoices = await InvoiceRepository.listByOwner(userId, tenants.map(t => t.id));
    const monthInvoices = allInvoices.filter(i => i.billingMonth === billingMonth);

    if (monthInvoices.length === 0) return ApiResponse.error('No invoices found for this billing month', 404);

    // Generate all PDFs before entering the archive Promise
    const pdfs = await Promise.all(
      monthInvoices.map(async inv => ({
        name: `${inv.invoiceNumber}.pdf`,
        buffer: await PdfService.generateInvoicePdf(inv),
      }))
    );

    // Generate ZIP in memory
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const output = new Writable({
        write(chunk, _enc, cb) { chunks.push(chunk); cb(); }
      });
      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.pipe(output);
      output.on('finish', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      for (const { name, buffer } of pdfs) {
        archive.append(buffer, { name });
      }
      archive.finalize();
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="invoices-${billingMonth}.zip"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: zipBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  }
}
