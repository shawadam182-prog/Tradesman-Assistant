/**
 * Mock Resend API responses for testing email functionality.
 */

export interface MockResendResponse {
  id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
}

export interface MockResendError {
  statusCode: number;
  message: string;
  name: string;
}

let sendCount = 0;

export function resetResendMock(): void {
  sendCount = 0;
}

export function getSendCount(): number {
  return sendCount;
}

/**
 * Creates a successful Resend send response.
 */
export function createMockResendSuccess(overrides: Partial<MockResendResponse> = {}): MockResendResponse {
  sendCount++;
  return {
    id: `re_${Date.now()}_${sendCount}`,
    from: 'Test Trade Co <noreply@tradesync.co.uk>',
    to: ['customer@example.com'],
    subject: 'Your Quote',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a Resend error response.
 */
export function createMockResendError(overrides: Partial<MockResendError> = {}): MockResendError {
  return {
    statusCode: 422,
    message: 'The `to` field must be a valid email address.',
    name: 'validation_error',
    ...overrides,
  };
}

/**
 * Creates a mock fetch function that simulates the Resend API.
 * Use with vi.stubGlobal('fetch', createMockResendFetch()) in tests.
 */
export function createMockResendFetch(options: {
  shouldFail?: boolean;
  failAfter?: number;
  errorMessage?: string;
} = {}) {
  let callCount = 0;

  return async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;

    // Only intercept Resend API calls
    if (!urlStr.includes('api.resend.com')) {
      return fetch(url, init);
    }

    callCount++;

    const shouldFail = options.shouldFail || (options.failAfter !== undefined && callCount > options.failAfter);

    if (shouldFail) {
      return new Response(
        JSON.stringify(createMockResendError({ message: options.errorMessage || 'Rate limit exceeded' })),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = init?.body ? JSON.parse(init.body as string) : {};
    const response = createMockResendSuccess({
      to: body.to || ['customer@example.com'],
      subject: body.subject || 'Test Email',
    });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };
}
