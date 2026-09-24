const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'That request was invalid. Please check your input and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: 'That conflicts with existing data. Please refresh and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
};

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Builds a user-friendly Error from a failed fetch Response.
 * The API's ApiResponse.error() envelope is `{ success: false, error: "<message>" }`;
 * this unwraps that message instead of surfacing the raw HTTP status/body.
 */
export async function parseApiError(response: Response): Promise<Error> {
  let message: string | undefined;

  try {
    const body = await response.json();
    if (body && typeof body.error === 'string' && body.error.trim()) {
      message = body.error;
    }
  } catch {
    // Response body wasn't JSON (e.g. an HTML error page from a proxy/gateway) — fall through.
  }

  if (!message) {
    message = DEFAULT_MESSAGES[response.status] ?? (response.status >= 500 ? 'Something went wrong on our end. Please try again later.' : FALLBACK_MESSAGE);
  }

  return new Error(message);
}
