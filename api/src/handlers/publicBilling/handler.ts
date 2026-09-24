import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../../lib/apiResponse';
import { PromoCodeRepository } from '../../repositories/promoCodeRepository';

// Unauthenticated, like every other /api/public/* route — a customer decides on pricing
// before signing up. Just the sitewide auto-apply promo lookup lives here now — validating
// a manually-entered code moved to BillingHandler (authenticated), since it needs the
// caller's account to correctly enforce the new-customers-only rule (see
// resolvePromoForAccount in lib/pricing.ts) and this route, being public, never has one.
export class PublicBillingHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;

    try {
      if (method === 'GET' && path.endsWith('/api/public/promo-codes/active-auto-apply')) {
        return await PublicBillingHandler.getActiveAutoApply();
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('PublicBillingHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  static async getActiveAutoApply(): Promise<APIGatewayProxyResult> {
    const promo = await PromoCodeRepository.findActiveAutoApply();
    return ApiResponse.success({ promo });
  }
}
