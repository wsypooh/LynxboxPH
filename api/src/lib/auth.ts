import { APIGatewayProxyEvent } from 'aws-lambda';
import { MembershipRepository } from '../repositories/membershipRepository';
import { AccountRepository } from '../repositories/accountRepository';
import { Plan } from '../models/account';

export type Role = 'owner' | 'manager' | 'staff' | 'viewer';

export interface Actor {
  sub: string;
  accountId: string;
  role: Role;
  isPlatformAdmin: boolean;
  displayName: string;
  email: string;
  plan: Plan;
}

// Confirmed via CloudWatch on the real deployed API (not guessed): API Gateway's HTTP API
// JWT authorizer renders an array-valued claim like cognito:groups as a bracket-wrapped,
// comma-separated, UNQUOTED string — e.g. "[platform-admin]" or "[group-a, group-b]" — which
// is neither valid JSON (missing quotes) nor a plain comma-joined string. Local dev's mock
// (local-server.ts) passes the real decoded-JWT array through untouched, so that path is fine.
function parseGroups(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];

  const trimmed = raw.trim();

  const bracketMatch = trimmed.match(/^\[(.*)\]$/);
  if (bracketMatch) {
    return bracketMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }

  // In case some other surface actually does send valid JSON.
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // fall through
  }

  return trimmed.split(',').map(s => s.trim()).filter(Boolean);
}

function getSub(event: APIGatewayProxyEvent): string | null {
  const claims = event.requestContext.authorizer?.claims;
  return claims?.sub
    || claims?.['cognito:username']
    || (process.env.IS_OFFLINE ? 'local-test-user-123' : null);
}

// API Gateway header casing isn't guaranteed to match what the client sent.
function getHeader(event: APIGatewayProxyEvent, name: string): string | undefined {
  const headers = event.headers || {};
  const lower = name.toLowerCase();
  const key = Object.keys(headers).find(k => k.toLowerCase() === lower);
  return key ? headers[key] : undefined;
}

export function isPlatformAdmin(event: APIGatewayProxyEvent): boolean {
  const claims = event.requestContext.authorizer?.claims;
  const groups = parseGroups(claims?.['cognito:groups']);
  return groups.includes('platform-admin');
}

/**
 * Resolves the authenticated caller, including which account they're currently
 * acting in. A user with no MEMBER# rows at all is a solo owner (today's implicit
 * behavior, unchanged): accountId === sub, role === 'owner'.
 *
 * A user who has been invited elsewhere (or invited others, which lazily creates
 * their own MEMBER# row too) may belong to multiple accounts. The frontend can
 * request a specific one via the X-Account-Id header; if it's absent, or doesn't
 * match a real membership, we default to the account where this user is 'owner'
 * (their own account), falling back to their first membership otherwise.
 */
export async function resolveActor(event: APIGatewayProxyEvent): Promise<Actor | null> {
  const sub = getSub(event);
  if (!sub) return null;

  const claims = event.requestContext.authorizer?.claims;
  const displayName = claims?.name
    || claims?.email
    || claims?.['cognito:username']
    || (process.env.IS_OFFLINE ? 'Local User' : 'Unknown');
  const email = claims?.email || (process.env.IS_OFFLINE ? 'local-test@example.com' : '');

  const memberships = await MembershipRepository.listByUser(sub);
  const requestedAccountId = getHeader(event, 'X-Account-Id');

  let membership = requestedAccountId
    ? memberships.find(m => m.accountId === requestedAccountId)
    : undefined;
  if (!membership) {
    membership = memberships.find(m => m.role === 'owner') || memberships[0];
  }

  // "status: invited" is purely informational (access is already granted via the MEMBER#
  // row regardless), but flip it to 'active' on this, their first authenticated request,
  // so the "manage members" list stops showing them as pending forever. Fire-and-forget —
  // this only ever writes once per member, and must never block/break the actual request.
  if (membership && membership.status === 'invited') {
    MembershipRepository.update(membership.accountId, membership.sub, { status: 'active' })
      .catch(err => console.error('Failed to mark member active on first login:', err));
  }

  const accountId = membership?.accountId ?? sub;
  // See docs/Pricing-Strategy-Plan.md — one extra Get, same per-request cost pattern as everything else here.
  const { plan } = await AccountRepository.getPlan(accountId);

  return {
    sub,
    accountId,
    role: membership?.role ?? 'owner',
    isPlatformAdmin: isPlatformAdmin(event),
    displayName,
    email,
    plan,
  };
}

export function canWrite(actor: Actor): boolean {
  return actor.role === 'owner' || actor.role === 'manager' || actor.role === 'staff';
}

export function canDestroy(actor: Actor): boolean {
  return actor.role === 'owner';
}

export function canManageMembers(actor: Actor): boolean {
  return actor.role === 'owner';
}
