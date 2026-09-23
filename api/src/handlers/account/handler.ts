import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../../lib/apiResponse';
import { Actor, canManageMembers, resolveActor } from '../../lib/auth';
import { MembershipRepository } from '../../repositories/membershipRepository';
import { Role } from '../../models/member';
import { findCognitoUserByEmail, createCognitoUser, generateTemporaryPassword } from '../../lib/cognitoAdmin';
import { ZeptoMailService } from '../../lib/zeptomail';

const mailer = new ZeptoMailService();
const INVITABLE_ROLES: Role[] = ['manager', 'staff', 'viewer'];

function getMemberSub(event: APIGatewayProxyEvent): string | null {
  const match = event.path.match(/\/api\/account\/members\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export class AccountHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;
    const actor = await resolveActor(event);
    if (!actor) return ApiResponse.unauthorized('Not authenticated');

    try {
      if (method === 'GET' && path.endsWith('/api/account/me')) {
        return AccountHandler.getMe(actor);
      } else if (method === 'GET' && path.endsWith('/api/account/memberships')) {
        return await AccountHandler.listMemberships(actor);
      } else if (method === 'GET' && path.endsWith('/api/account/members')) {
        return await AccountHandler.listMembers(actor);
      } else if (method === 'POST' && path.endsWith('/api/account/members')) {
        if (!canManageMembers(actor)) return ApiResponse.forbidden('Only the account owner can invite members');
        return await AccountHandler.inviteMember(event, actor);
      } else if (method === 'PUT' && path.match(/\/api\/account\/members\/[^/]+$/)) {
        if (!canManageMembers(actor)) return ApiResponse.forbidden('Only the account owner can change member roles');
        return await AccountHandler.updateMemberRole(event, actor);
      } else if (method === 'DELETE' && path.match(/\/api\/account\/members\/[^/]+$/)) {
        if (!canManageMembers(actor)) return ApiResponse.forbidden('Only the account owner can remove members');
        return await AccountHandler.removeMember(event, actor);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('AccountHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static getMe(actor: Actor): APIGatewayProxyResult {
    return ApiResponse.success({
      accountId: actor.accountId,
      role: actor.role,
      isPlatformAdmin: actor.isPlatformAdmin,
      displayName: actor.displayName,
      email: actor.email,
    });
  }

  static async listMemberships(actor: Actor): Promise<APIGatewayProxyResult> {
    const memberships = await MembershipRepository.listByUser(actor.sub);
    // A solo user who's never invited/been invited anywhere has no MEMBER# rows at all.
    const result = memberships.length > 0
      ? memberships.map(m => ({ accountId: m.accountId, role: m.role }))
      : [{ accountId: actor.sub, role: 'owner' as const }];
    return ApiResponse.success({ memberships: result });
  }

  static async listMembers(actor: Actor): Promise<APIGatewayProxyResult> {
    const members = await MembershipRepository.listByAccount(actor.accountId);
    if (members.length === 0) {
      // Solo account that's never invited anyone — no MEMBER# rows exist yet, actor is the owner.
      return ApiResponse.success({
        members: [{ sub: actor.sub, email: actor.email, role: 'owner', status: 'active' }],
      });
    }
    return ApiResponse.success({
      members: members.map(m => ({ sub: m.sub, email: m.email, role: m.role, status: m.status })),
    });
  }

  static async inviteMember(event: APIGatewayProxyEvent, actor: Actor): Promise<APIGatewayProxyResult> {
    const body = JSON.parse(event.body || '{}');
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    const role = body.role as Role | undefined;

    if (!email || !role) return ApiResponse.error('email and role are required');
    if (!INVITABLE_ROLES.includes(role)) return ApiResponse.error('role must be manager, staff, or viewer');

    // First invite on a solo account lazily creates the owner's own MEMBER# row too.
    const existingMembers = await MembershipRepository.listByAccount(actor.accountId);
    if (existingMembers.length === 0) {
      await MembershipRepository.create({
        accountId: actor.accountId,
        sub: actor.sub,
        role: 'owner',
        status: 'active',
        email: actor.email,
        invitedByEmail: actor.email,
      });
    }

    const existingUser = await findCognitoUserByEmail(email);
    let sub: string;
    let status: 'invited' | 'active';

    if (existingUser) {
      // Already has a Lynxbox login elsewhere — just grant access to this account.
      sub = existingUser.sub;
      status = 'active';
    } else {
      const temporaryPassword = generateTemporaryPassword();
      const created = await createCognitoUser(email, temporaryPassword);
      sub = created.sub;
      status = 'invited';
      await mailer.sendAccountInviteEmail({
        toEmail: email,
        inviterEmail: actor.email,
        role,
        temporaryPassword,
        signInUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/signin`,
      });
    }

    const alreadyMember = await MembershipRepository.get(actor.accountId, sub);
    if (alreadyMember) return ApiResponse.error('This person is already a member of this account', 400);

    const member = await MembershipRepository.create({
      accountId: actor.accountId,
      sub,
      role,
      status,
      email,
      invitedByEmail: actor.email,
    });

    return ApiResponse.success({ member }, 201);
  }

  static async updateMemberRole(event: APIGatewayProxyEvent, actor: Actor): Promise<APIGatewayProxyResult> {
    const sub = getMemberSub(event);
    if (!sub) return ApiResponse.notFound('Member not found');

    const body = JSON.parse(event.body || '{}');
    const role = body.role as Role | undefined;
    if (!role || !INVITABLE_ROLES.includes(role)) return ApiResponse.error('role must be manager, staff, or viewer');

    const member = await MembershipRepository.get(actor.accountId, sub);
    if (!member) return ApiResponse.notFound('Member not found');
    if (member.role === 'owner') return ApiResponse.forbidden("The account owner's role cannot be changed");

    const updated = await MembershipRepository.update(actor.accountId, sub, { role });
    return ApiResponse.success({ member: updated });
  }

  static async removeMember(event: APIGatewayProxyEvent, actor: Actor): Promise<APIGatewayProxyResult> {
    const sub = getMemberSub(event);
    if (!sub) return ApiResponse.notFound('Member not found');

    const member = await MembershipRepository.get(actor.accountId, sub);
    if (!member) return ApiResponse.notFound('Member not found');
    if (member.role === 'owner') return ApiResponse.forbidden('The account owner cannot be removed');

    await MembershipRepository.remove(actor.accountId, sub);
    return ApiResponse.success({ message: 'Removed' });
  }
}
