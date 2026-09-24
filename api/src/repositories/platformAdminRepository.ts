import { ddbDocClient, EntityType, BaseEntity } from '../lib/dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

export interface AccountSummary {
  accountId: string;
  propertyCount: number;
  activeListingCount: number;
  tenantCount: number;
  buildingCount: number;
  documentCount: number;
  invoicesByMonth: Record<string, number>;
}

export interface PlatformSummary {
  totalAccounts: number;
  accounts: AccountSummary[];
  generatedAt: string;
}

async function scanEntireTable(): Promise<BaseEntity[]> {
  const items: BaseEntity[] = [];
  let lastKey: Record<string, any> | undefined;
  do {
    const { Items = [], LastEvaluatedKey } = await ddbDocClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(Items as BaseEntity[]));
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return items;
}

export class PlatformAdminRepository {
  static async getPlatformSummary(): Promise<PlatformSummary> {
    const items = await scanEntireTable();
    const accounts = new Map<string, AccountSummary>();

    for (const item of items as any[]) {
      if (item.deletedAt) continue;
      const ownerId = item.ownerId;
      if (!ownerId) continue;

      let bucket = accounts.get(ownerId);
      if (!bucket) {
        bucket = { accountId: ownerId, propertyCount: 0, activeListingCount: 0, tenantCount: 0, buildingCount: 0, documentCount: 0, invoicesByMonth: {} };
        accounts.set(ownerId, bucket);
      }

      switch (item.entityType) {
        case EntityType.PROPERTY:
          bucket.propertyCount++;
          // Matches BillingHandler.getUsage()'s definition — everything except the
          // permanent plan-downgrade 'unlisted' status counts as an active listing.
          if (item.status !== 'unlisted') bucket.activeListingCount++;
          break;
        case EntityType.TENANT:
          bucket.tenantCount++;
          break;
        case EntityType.BUILDING:
          bucket.buildingCount++;
          break;
        case EntityType.DOCUMENT:
          bucket.documentCount++;
          break;
        case EntityType.INVOICE: {
          const month = item.billingMonth || 'unknown';
          bucket.invoicesByMonth[month] = (bucket.invoicesByMonth[month] || 0) + 1;
          break;
        }
        default:
          break;
      }
    }

    return {
      totalAccounts: accounts.size,
      accounts: Array.from(accounts.values()),
      generatedAt: new Date().toISOString(),
    };
  }
}
