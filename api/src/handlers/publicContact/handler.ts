// src/handlers/publicContact/handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../../lib/apiResponse';
import { ZeptoMailService } from '../../lib/zeptomail';

export interface ContactFormRequest {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

// Unauthenticated, like every other /api/public/* route — visitors reaching the
// Contact Us page haven't signed up yet. Just sends a notification email to the
// internal support inbox via ZeptoMailService, same as the waitlist signup flow.
export class PublicContactHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const path = event.path;

    try {
      if (method === 'POST' && path.endsWith('/api/public/contact')) {
        return await PublicContactHandler.submit(event);
      }
      return ApiResponse.notFound('Route not found');
    } catch (err) {
      console.error('PublicContactHandler error:', err);
      return ApiResponse.error('Internal server error', 500);
    }
  }

  private static async submit(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (!event.body) {
      return ApiResponse.error('Request body is required', 400);
    }

    const data: ContactFormRequest = JSON.parse(event.body);

    if (!data.name?.trim()) {
      return ApiResponse.error('Name is required', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      return ApiResponse.error('A valid email is required', 400);
    }

    if (!data.message?.trim()) {
      return ApiResponse.error('Message is required', 400);
    }

    const mailer = new ZeptoMailService();
    await mailer.sendContactFormEmail({
      name: data.name.trim(),
      email: data.email.trim(),
      subject: data.subject?.trim(),
      message: data.message.trim(),
    });

    return ApiResponse.success({ message: 'Message sent' }, 201);
  }
}
