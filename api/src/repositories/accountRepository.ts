import { ddbDocClient, EntityType } from '../lib/dynamodb';
import { AccountPlan, Plan, createAccountPlan, defaultAccountPlan } from '../models/account';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';

function usageKey(accountId: string, yearMonth: string) {
  return { PK: `ACCOUNT#${accountId}`, SK: `USAGE#${accountId}#${yearMonth}` };
}

export class AccountRepository {
  // Returns the whole row (not narrowed to { plan }) — a later plan adds more fields
  // (subscriptionStatus, trial dates, etc.) to this same PLAN# row and reads them off
  // this same Get at zero extra cost.
  static async getPlan(accountId: string): Promise<AccountPlan> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ACCOUNT#${accountId}`, SK: `PLAN#${accountId}` },
    }));
    if (!Item) return defaultAccountPlan(accountId);
    return Item as AccountPlan;
  }

  static async setPlan(accountId: string, plan: Plan): Promise<AccountPlan> {
    const account = createAccountPlan(accountId, plan);
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...account },
    }));
    return account;
  }

  static async getMonthlyInvoiceCount(accountId: string, yearMonth: string): Promise<number> {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: usageKey(accountId, yearMonth),
    }));
    return (Item?.invoiceCount as number | undefined) ?? 0;
  }

  static async incrementMonthlyInvoiceCount(accountId: string, yearMonth: string): Promise<number> {
    const now = new Date().toISOString();
    const { Attributes } = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: usageKey(accountId, yearMonth),
      UpdateExpression: 'ADD invoiceCount :one SET entityType = :entityType, accountId = :accountId, yearMonth = :yearMonth, updatedAt = :now, createdAt = if_not_exists(createdAt, :now)',
      ExpressionAttributeValues: {
        ':one': 1,
        ':entityType': EntityType.ACCOUNT,
        ':accountId': accountId,
        ':yearMonth': yearMonth,
        ':now': now,
      },
      ReturnValues: 'ALL_NEW',
    }));
    return (Attributes?.invoiceCount as number) ?? 0;
  }
}
