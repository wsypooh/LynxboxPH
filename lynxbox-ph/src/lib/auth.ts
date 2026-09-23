import { fetchAuthSession, type AuthSession } from 'aws-amplify/auth'

export async function getCurrentJWTToken(): Promise<string | null> {
  try {
    const session: AuthSession = await fetchAuthSession()
    return session.tokens?.idToken?.toString() || null
  } catch (error) {
    console.error('Error fetching JWT token:', error)
    return null
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session: AuthSession = await fetchAuthSession()
    const userId = session.tokens?.idToken?.payload?.sub as string || null
    
    // Fallback for local development
    if (!userId && process.env.NODE_ENV === 'development') {
      // Check if we're using local API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      if (apiUrl.includes('localhost')) {
        return 'local-test-user-123'; // Match the local server's mock user ID
      }
    }
    
    return userId;
  } catch (error) {
    console.error('Error fetching user ID from JWT:', error)
    
    // Fallback for local development
    if (process.env.NODE_ENV === 'development') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      if (apiUrl.includes('localhost')) {
        return 'local-test-user-123'; // Match the local server's mock user ID
      }
    }
    
    return null;
  }
}

const ACTIVE_ACCOUNT_STORAGE_KEY = 'lynxbox-active-account-id';

// Viewer-side convenience only — the backend always validates this against a real
// membership and ignores/falls back silently if it doesn't recognize the account.
export function getActiveAccountId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setActiveAccountId(accountId: string): void {
  try {
    localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, accountId);
  } catch {
    // ignore (e.g. private browsing with storage disabled)
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentJWTToken();
  if (!token) {
    return {};
  }
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`
  };
  const activeAccountId = getActiveAccountId();
  if (activeAccountId) {
    headers['X-Account-Id'] = activeAccountId;
  }
  return headers;
}

// Client-side check only — a defense-in-depth convenience for hiding/showing UI.
// Real enforcement always happens server-side via isPlatformAdmin() in api/src/lib/auth.ts.
export async function getIsPlatformAdmin(): Promise<boolean> {
  try {
    const session: AuthSession = await fetchAuthSession()
    const raw = session.tokens?.idToken?.payload?.['cognito:groups']
    const groups = Array.isArray(raw)
      ? raw
      : typeof raw === 'string'
        ? raw.split(',').map(s => s.trim()).filter(Boolean)
        : []
    return groups.includes('platform-admin')
  } catch (error) {
    console.error('Error checking platform-admin status:', error)
    return false
  }
}
