import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'ap-southeast-1',
});

const USER_POOL_ID = process.env.USER_POOL_ID || '';

// Satisfies the User Pool's password policy (min 8, upper, lower, number, symbol).
export function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;
  const pick = (charset: string) => charset[Math.floor(Math.random() * charset.length)];

  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols), ...Array.from({ length: 8 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export async function findCognitoUserByEmail(email: string): Promise<{ sub: string } | null> {
  try {
    const result = await client.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email }));
    const sub = result.UserAttributes?.find(a => a.Name === 'sub')?.Value;
    return sub ? { sub } : null;
  } catch (err: any) {
    if (err.name === 'UserNotFoundException') return null;
    throw err;
  }
}

// This User Pool uses email as a sign-in alias, but the actual internal `Username` Cognito
// auto-generates for each user is the same UUID as their `sub` — so a sub doubles as a valid
// lookup key here. Used only for display purposes (e.g. showing a real email instead of a raw
// accountId in the platform-admin dashboard); never treat this as an authorization check.
export async function getCognitoUserEmail(sub: string): Promise<string | null> {
  try {
    const result = await client.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: sub }));
    return result.UserAttributes?.find(a => a.Name === 'email')?.Value ?? null;
  } catch (err: any) {
    if (err.name === 'UserNotFoundException') return null;
    throw err;
  }
}

// Creates the user with MessageAction SUPPRESS so Cognito doesn't send its own unbranded
// invite email — the caller sends its own via ZeptoMailService with the temp password.
// Total registered users across the whole User Pool (a platform-wide count, not per-account).
// EstimatedNumberOfUsers is a cheap, already-computed figure on the pool — not a live/exact
// count (Cognito documents it as eventually consistent), which is fine for a dashboard stat.
export async function getUserPoolUserCount(): Promise<number> {
  const result = await client.send(new DescribeUserPoolCommand({ UserPoolId: USER_POOL_ID }));
  return result.UserPool?.EstimatedNumberOfUsers ?? 0;
}

export async function createCognitoUser(email: string, temporaryPassword: string): Promise<{ sub: string }> {
  const result = await client.send(new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    TemporaryPassword: temporaryPassword,
    MessageAction: 'SUPPRESS',
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
      // No real name is collected at invite time — default to the email so the UI never
      // falls back to Cognito's internal random-UUID username. The invitee can change
      // their display name anytime via the existing profile page.
      { Name: 'name', Value: email },
    ],
  }));
  const sub = result.User?.Attributes?.find(a => a.Name === 'sub')?.Value;
  if (!sub) throw new Error('Cognito did not return a sub for the newly created user');
  return { sub };
}
