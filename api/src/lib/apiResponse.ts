import { APIGatewayProxyResult } from 'aws-lambda';

export class ApiResponse {
  static success(data: any, statusCode = 200, headers?: Record<string, string>): APIGatewayProxyResult {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
      body: JSON.stringify({
        success: true,
        data,
      }),
    };
  }

  static error(message: string, statusCode = 400, errors?: any[]): APIGatewayProxyResult {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: message,
        ...(errors && { errors }),
      }),
    };
  }

  static notFound(message = 'Resource not found'): APIGatewayProxyResult {
    return this.error(message, 404);
  }

  static unauthorized(message = 'Unauthorized'): APIGatewayProxyResult {
    return this.error(message, 401);
  }

  static forbidden(message = 'Forbidden'): APIGatewayProxyResult {
    return this.error(message, 403);
  }
}
