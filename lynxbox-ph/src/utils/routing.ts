/**
 * Utility functions for routing. CloudFront handles .html rewriting via
 * the url-rewrite function, so all paths are always clean (no .html suffix).
 */

const getBaseUrlInternal = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  return '';
};

/**
 * Generic URL generator for any path
 * @param path - Any route path
 * @returns The appropriate URL for the current environment
 */
export function getUrl(path: string): string {
  const baseUrl = getBaseUrlInternal();
  return `${baseUrl}${path}`;
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
  return getBaseUrlInternal();
}
