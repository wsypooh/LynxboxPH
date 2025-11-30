import { fetchAuthSession, type AuthSession } from 'aws-amplify/auth'

export async function getCurrentJWTToken(): Promise<string | null> {
  try {
    const session: AuthSession = await fetchAuthSession()
    return session.tokens?.accessToken?.toString() || null
  } catch (error) {
    console.error('Error fetching JWT token:', error)
    return null
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session: AuthSession = await fetchAuthSession()
    const userId = session.tokens?.accessToken?.payload?.sub as string || null
    
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

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentJWTToken();
  if (!token) {
    return {};
  }
  return {
    'Authorization': `Bearer ${token}`
  };
}
