import { EntityType, BaseEntity } from '../lib/dynamodb';

export type Role = 'owner' | 'manager' | 'staff' | 'viewer';
export type MemberStatus = 'invited' | 'active';

export interface Member extends BaseEntity {
  [key: string]: any;
  id: string;
  accountId: string;
  sub: string;
  role: Role;
  status: MemberStatus;
  email: string;
  invitedByEmail: string;
  deletedAt?: string;
}

export type MemberInput = {
  accountId: string;
  sub: string;
  role: Role;
  status: MemberStatus;
  email: string;
  invitedByEmail: string;
};

export function createMember(data: MemberInput): Member {
  const now = new Date().toISOString();
  return {
    PK: `ACCOUNT#${data.accountId}`,
    SK: `MEMBER#${data.sub}`,
    GSI1PK: `USER#${data.sub}`,
    GSI1SK: `MEMBER#${data.accountId}`,
    entityType: EntityType.MEMBER,
    id: `${data.accountId}#${data.sub}`,
    accountId: data.accountId,
    sub: data.sub,
    role: data.role,
    status: data.status,
    email: data.email,
    invitedByEmail: data.invitedByEmail,
    createdAt: now,
    updatedAt: now,
  };
}
