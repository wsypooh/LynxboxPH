// One-time backfill: PropertyRepository.getNextPropertyNumber() only started running once
// this deploy reached the environment — any Property created before that has no
// `propertyNumber` field. Assigns numbers in createdAt order (oldest first) by drawing from
// the same atomic counter new creates use, so uniqueness is guaranteed regardless of how
// this interleaves with any properties created concurrently. Safe to re-run: skips anything
// that already has a propertyNumber (ConditionExpression), so a second run only picks up
// whatever's still missing one.
// Run with `npm run properties:backfill-numbers` from api/.
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient, EntityType } from '../lib/dynamodb';
import { PropertyRepository } from '../repositories/propertyRepository';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

async function main() {
  const missing: { id: string; createdAt: string }[] = [];
  let ExclusiveStartKey: any = undefined;
  do {
    const res = await ddbDocClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :t AND attribute_not_exists(propertyNumber)',
      ExpressionAttributeValues: { ':t': EntityType.PROPERTY },
      ProjectionExpression: 'id, createdAt',
      ExclusiveStartKey,
    }));
    for (const item of res.Items || []) {
      if (item.id && item.createdAt) missing.push({ id: item.id, createdAt: item.createdAt });
    }
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  missing.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  console.log(`Found ${missing.length} propert${missing.length === 1 ? 'y' : 'ies'} missing a property number.`);

  let assigned = 0;
  for (const { id } of missing) {
    const propertyNumber = await PropertyRepository.getNextPropertyNumber();
    try {
      await ddbDocClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PROPERTY#${id}`, SK: `PROPERTY#${id}` },
        UpdateExpression: 'SET propertyNumber = :propertyNumber',
        ConditionExpression: 'attribute_not_exists(propertyNumber)',
        ExpressionAttributeValues: { ':propertyNumber': propertyNumber },
      }));
      assigned++;
      console.log(`  ${id} -> ${propertyNumber}`);
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        console.log(`  ${id} already has a property number, skipped`);
      } else {
        throw err;
      }
    }
  }

  console.log(`Backfill complete. Assigned ${assigned} propert${assigned === 1 ? 'y' : 'ies'} number(s).`);
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
