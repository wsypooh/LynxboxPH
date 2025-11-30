/**
 * Example usage of the routing utility
 * 
 * This file demonstrates how to use the unified routing system
 * that works in both local development and production (CloudFront)
 */

import Link from 'next/link';
import { route, getManagePropertyUrl, getAddPropertyUrl } from '@/utils/routing';

export function RoutingExample() {
  return (
    <div>
      {/* Using the generic route() function - recommended for most cases */}
      <Link href={route('/dashboard')}>
        Dashboard
      </Link>
      
      <Link href={route('/properties')}>
        Properties (Public)
      </Link>
      
      <Link href={route('/dashboard/properties/manage')}>
        Manage Properties (Dashboard)
      </Link>
      
      <Link href={route('/dashboard/properties/add')}>
        Add Property (Dashboard)
      </Link>
      
      <Link href={route('/properties/123')}>
        Property Details
      </Link>

      {/* Using specific helper functions */}
      <Link href={getManagePropertyUrl()}>
        Manage Property (Dashboard)
      </Link>
      
      <Link href={getAddPropertyUrl()}>
        Add Property (Dashboard)
      </Link>
    </div>
  );
}

/**
 * Environment Behavior:
 * 
 * Local Development (.env.local with NEXT_PUBLIC_IS_DEVELOPMENT=true):
 * - route('/dashboard') → '/dashboard'
 * - route('/properties') → '/properties'
 * - route('/dashboard/properties/manage') → '/dashboard/properties/manage'
 * - route('/dashboard/properties/add') → '/dashboard/properties/add'
 * 
 * Production (.env.production with NEXT_PUBLIC_IS_DEVELOPMENT=false):
 * - route('/dashboard') → 'https://d2ojml4np7snv4.cloudfront.net/dashboard.html'
 * - route('/properties') → 'https://d2ojml4np7snv4.cloudfront.net/properties.html'
 * - route('/dashboard/properties/manage') → 'https://d2ojml4np7snv4.cloudfront.net/dashboard/properties/manage.html'
 * - route('/dashboard/properties/add') → 'https://d2ojml4np7snv4.cloudfront.net/dashboard/properties/add.html'
 */
