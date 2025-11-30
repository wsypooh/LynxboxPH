/**
 * Utility functions for handling routing differences between local and production environments
 */

// Check if we're in production (CloudFront) environment
const isProduction = 
  process.env.NODE_ENV === 'production' || 
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  process.env.NEXT_PUBLIC_IS_DEVELOPMENT === 'false' ||
  (typeof window !== 'undefined' && window.location.hostname.includes('cloudfront.net'));

/**
 * Generic URL generator for any path
 * @param path - Any route path
 * @returns The appropriate URL for the current environment
 */
export function getUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  
  if (isProduction) {
    // In production, append .html for CloudFront static hosting
    // This handles all routes including nested ones
    return `${baseUrl}${path.replace(/\/$/, '')}.html`;
  }
  // In development, use normal Next.js routing
  return path;
}

/**
 * Helper for creating links that work in both environments
 * Usage: <Link href={route('/properties/manage')}>Manage</Link>
 * @param path - The route path
 * @returns The appropriate URL for the current environment
 */
export function route(path: string): string {
  return getUrl(path);
}

/**
 * Generate dashboard property management URL
 * @returns The appropriate URL for property management
 */
export function getManagePropertyUrl(): string {
  return getUrl('/dashboard/properties/manage');
}

/**
 * Generate add property URL
 * @returns The appropriate URL for adding properties
 */
export function getAddPropertyUrl(): string {
  return getUrl('/dashboard/properties/add');
}

/**
 * Generate property detail URL
 * @param propertyId - The ID of the property
 * @returns The appropriate URL for property details
 */
export function getPropertyDetailUrl(propertyId: string): string {
  return getUrl(`/properties/${propertyId}`);
}

/**
 * Generate dashboard URL
 * @returns The appropriate URL for dashboard
 */
export function getDashboardUrl(): string {
  return getUrl('/dashboard');
}

/**
 * Get the base URL for the current environment
 * @returns The base URL (empty for local development, full URL for production)
 */
export function getBaseUrl(): string {
  return isProduction ? (process.env.NEXT_PUBLIC_APP_URL || '') : '';
}
