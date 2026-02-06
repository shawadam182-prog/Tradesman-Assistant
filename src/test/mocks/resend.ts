/**
 * Mock SendGrid API responses for testing email functionality.
 */

export interface MockSendGridSuccess {
  message_id: string;
}

export interface MockSendGridError {
  errors: { message: string; field?: string; help?: string }[];
}

let sendCount = 0;

export function resetSendGridMock(): void {
  sendCount = 0;
}

export function getSendCount(): number {
  return sendCount;
}

/**
 * Creates a successful SendGrid send response.
 * SendGrid returns 202 with an x-message-id header and empty body on success.
 */
export function createMockSendGridSuccess(): MockSendGridSuccess {
  sendCount++;
  return {
    message_id: `sg_${Date.now()}_${sendCount}`,
  };
}

/**
 * Creates a SendGrid error response.
 */
export function createMockSendGridError(overrides: Partial<MockSendGridError> = {}): MockSendGridError {
  return {
    errors: [{ message: 'The to field is required.', field: 'personalizations.0.to' }],
    ...overrides,
  };
}

/**
 * Creates a mock fetch function that simulates the SendGrid v3 mail/send API.
 * Use with vi.stubGlobal('fetch', createMockSendGridFetch()) in tests.
 */
export function createMockSendGridFetch(options: {
  shouldFail?: boolean;
  failAfter?: number;
  errorMessage?: string;
} = {}) {
  let callCount = 0;

  return async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;

    // Only intercept SendGrid API calls
    if (!urlStr.includes('api.sendgrid.com')) {
      return fetch(url, init);
    }

    callCount++;

    const shouldFail = options.shouldFail || (options.failAfter !== undefined && callCount > options.failAfter);

    if (shouldFail) {
      return new Response(
        JSON.stringify(createMockSendGridError({
          errors: [{ message: options.errorMessage || 'Rate limit exceeded' }],
        })),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const success = createMockSendGridSuccess();

    // SendGrid returns 202 with empty body on success, message ID in header
    return new Response(
      null,
      {
        status: 202,
        headers: {
          'Content-Type': 'application/json',
          'x-message-id': success.message_id,
        },
      }
    );
  };
}

// Re-export with old names for backwards compatibility during transition
export const resetResendMock = resetSendGridMock;
export const createMockResendFetch = createMockSendGridFetch;
