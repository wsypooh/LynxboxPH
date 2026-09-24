// One-time backfill: AccountRepository.incrementMonthlyInvoiceCount() only started running
// once the Pricing/Payments Lambda deploy actually reached the deployed environment — any
// invoice created before that deploy never incremented its USAGE#<accountId>#<yearMonth>
// counter, so "Invoices this month" under-reports for pre-existing accounts. This derives
// the correct counts straight from real Invoice records (the source of truth) and writes
// them as the counter value (not an ADD), so it's safe to re-run. Run with
// `npm run usage:backfill` from api/.
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient, EntityType } from '../lib/dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

async function main() {
  const countsByOwnerMonth = new Map<string, number>();
  let ExclusiveStartKey: any = undefined;
  do {
    const res = await ddbDocClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :t',
      ExpressionAttributeValues: { ':t': EntityType.INVOICE },
      ProjectionExpression: 'ownerId, createdAt',
      ExclusiveStartKey,
    }));
    for (const item of res.Items || []) {
      const yearMonth = (item.createdAt as string)?.slice(0, 7);
      if (!item.ownerId || !yearMonth) continue;
      const key = `${item.ownerId}#${yearMonth}`;
      countsByOwnerMonth.set(key, (countsByOwnerMonth.get(key) || 0) + 1);
    }
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  console.log(`Found ${countsByOwnerMonth.size} account+month bucket(s) to backfill.`);

  const now = new Date().toISOString();
  for (const [key, count] of countsByOwnerMonth) {
    const [accountId, yearMonth] = key.split('#');
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `ACCOUNT#${accountId}`,
        SK: `USAGE#${accountId}#${yearMonth}`,
        entityType: EntityType.ACCOUNT,
        accountId,
        yearMonth,
        invoiceCount: count,
        createdAt: now,
        updatedAt: now,
      },
    }));
    console.log(`  ${accountId} ${yearMonth}: ${count}`);
  }

  console.log('Backfill complete.');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
