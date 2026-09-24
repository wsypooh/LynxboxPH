export type Role = 'owner' | 'manager' | 'staff' | 'viewer';
export type MemberStatus = 'invited' | 'active';

export interface AccountContext {
  accountId: string;
  role: Role;
  isPlatformAdmin: boolean;
  displayName: string;
  email: string;
}

export interface Membership {
  accountId: string;
  role: Role;
  ownerEmail?: string | null;
}

export interface AccountMember {
  sub: string;
  email: string;
  role: Role;
  status: MemberStatus;
}

export interface InviteMemberInput {
  email: string;
  role: Exclude<Role, 'owner'>;
}
