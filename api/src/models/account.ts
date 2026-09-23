import { EntityType, BaseEntity } from '../lib/dynamodb';

export type Plan = 'free' | 'starter' | 'growth' | 'business';

export interface AccountPlan extends BaseEntity {
  [key: string]: any;
  accountId: string;
  plan: Plan;
  planUpdatedAt: string;
}

export function createAccountPlan(accountId: string, plan: Plan): AccountPlan {
  const now = new Date().toISOString();
  return {
    PK: `ACCOUNT#${accountId}`,
    SK: `PLAN#${accountId}`,
    entityType: EntityType.ACCOUNT,
    id: accountId,
    accountId,
    plan,
    planUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

// Default plan for an account that has no PLAN# row yet — mirrors the zero-migration,
// lazy-default pattern RBAC already uses for solo accounts with no MEMBER# rows.
export function defaultAccountPlan(accountId: string): AccountPlan {
  return {
    PK: `ACCOUNT#${accountId}`,
    SK: `PLAN#${accountId}`,
    entityType: EntityType.ACCOUNT,
    id: accountId,
    accountId,
    plan: 'free',
    planUpdatedAt: '',
    createdAt: '',
    updatedAt: '',
  };
}
