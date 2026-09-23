import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../../lib/apiResponse';
import { isPlatformAdmin } from '../../lib/auth';
import { PlatformAdminRepository } from '../../repositories/platformAdminRepository';
import { PropertyRepository } from '../../repositories/propertyRepository';
import { BuildingRepository } from '../../repositories/buildingRepository';
import { TenantRepository } from '../../repositories/tenantRepository';
import { InvoiceRepository } from '../../repositories/invoiceRepository';
import { DocumentRepository } from '../../repositories/documentRepository';
import { getCognitoUserEmail, getUserPoolUserCount } from '../../lib/cognitoAdmin';
import { MembershipRepository } from '../../repositories/membershipRepository';

function getAccountId(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/platform-admin\/accounts\/([^/]+)/);
  return match ? match[1] : null;
}

export class PlatformAdminDashboardHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (!isPlatformAdmin(event)) {
      // Temporary diagnostic: if this 401s again, check CloudWatch for this log line to see
      // exactly how cognito:groups is shaped on this deployment, rather than guessing again.
      console.log('PlatformAdmin denied — raw claims:', JSON.stringify(event.requestContext.authorizer?.claims));
      return ApiResponse.unauthorized('Platform admin access required');
    }

    const method = event.httpMethod;
    const path = event.path;

    try {
      if (method === 'GET' && path.match(/\/api\/platform-admin\/accounts\/[^/]+$/)) {
        return await PlatformAdminDashboardHandler.getAccountDetail(event);
      } else if (method === 'GET' && path.match(/\/api\/platform-admin\/dashboard\/summary$/)) {
        return await PlatformAdminDashboardHandler.getSummary();
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('PlatformAdminDashboardHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async getSummary(): Promise<APIGatewayProxyResult> {
    const [summary, totalUsers] = await Promise.all([
      PlatformAdminRepository.getPlatformSummary(),
      getUserPoolUserCount().catch(() => null),
    ]);

    // Enrich each account with its real owner email and member count for display.
    // Best-effort throughout: a lookup failure (e.g. a deleted user) falls back to
    // null/1, never blocks the page.
    const accounts = await Promise.all(summary.accounts.map(async account => {
      const [ownerEmail, members] = await Promise.all([
        getCognitoUserEmail(account.accountId).catch(() => null),
        MembershipRepository.listByAccount(account.accountId).catch(() => []),
      ]);
      // Solo accounts that never invited anyone have zero MEMBER# rows — they're still one user (the owner).
      const memberCount = members.length > 0 ? members.length : 1;
      return { ...account, ownerEmail, memberCount };
    }));

    return ApiResponse.success({ ...summary, totalUsers, accounts });
  }

  static async getAccountDetail(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const accountId = getAccountId(event);
    if (!accountId) return ApiResponse.notFound('Account not found');

    const [properties, buildings, tenants, documents, ownerEmail] = await Promise.all([
      PropertyRepository.listByOwner(accountId, 1000),
      BuildingRepository.listByOwner(accountId),
      TenantRepository.listByOwner(accountId),
      DocumentRepository.listByOwner(accountId),
      getCognitoUserEmail(accountId).catch(() => null),
    ]);

    const invoices = await InvoiceRepository.listByOwner(accountId, tenants.map(t => t.id));

    return ApiResponse.success({
      accountId,
      ownerEmail,
      properties: properties.items,
      buildings,
      tenants,
      documents,
      invoices,
    });
  }
}
