import { vi } from 'vitest';
import type { User, Session } from '@supabase/supabase-js';

// Default mock user
export const mockUser: User = {
  id: 'test-user-id',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  phone: '',
  confirmed_at: '2024-01-01T00:00:00Z',
  last_sign_in_at: '2024-01-15T00:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'Test User' },
  identities: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

// Default mock session
export const mockSession: Session = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user: mockUser,
};

// Response types for chained methods
interface MockQueryResponse<T> {
  data: T | null;
  error: Error | null;
  count?: number;
  status?: number;
  statusText?: string;
}

// Store for mock responses per table
const mockResponses: Map<string, MockQueryResponse<unknown>> = new Map();

// Helper to set mock response for a specific table/operation
export function setMockResponse<T>(
  table: string,
  response: MockQueryResponse<T>
): void {
  mockResponses.set(table, response);
}

// Helper to set a successful response with data
export function setMockData<T>(table: string, data: T): void {
  mockResponses.set(table, { data, error: null });
}

// Helper to set an error response
export function setMockError(table: string, message: string): void {
  mockResponses.set(table, { data: null, error: new Error(message) });
}

// Clear all mock responses
export function clearMockResponses(): void {
  mockResponses.clear();
}

// Get the mock response for a table, or default to empty success
function getMockResponse(table: string): MockQueryResponse<unknown> {
  return mockResponses.get(table) ?? { data: null, error: null };
}

// Create a chainable query builder mock
function createQueryBuilder(tableName: string) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(getMockResponse(tableName))),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(getMockResponse(tableName))),
    throwOnError: vi.fn().mockReturnThis(),
    then: (resolve: (value: MockQueryResponse<unknown>) => void) => {
      return Promise.resolve(getMockResponse(tableName)).then(resolve);
    },
  };

  return builder;
}

// Auth mock state
let currentUser: User | null = mockUser;
let currentSession: Session | null = mockSession;

// Helper to set auth state
export function setMockAuth(user: User | null, session: Session | null = null): void {
  currentUser = user;
  currentSession = session ?? (user ? { ...mockSession, user } : null);
}

// Helper to set authenticated state
export function setMockAuthenticated(authenticated = true): void {
  if (authenticated) {
    currentUser = mockUser;
    currentSession = mockSession;
  } else {
    currentUser = null;
    currentSession = null;
  }
}

// Create the mock Supabase client
export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: { user: currentUser },
          error: null,
        })
      ),
      getSession: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: { session: currentSession },
          error: null,
        })
      ),
      signInWithPassword: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: { user: currentUser, session: currentSession },
          error: null,
        })
      ),
      signInWithOAuth: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: { url: 'https://oauth.example.com' }, error: null })
      ),
      signUp: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: { user: currentUser, session: currentSession },
          error: null,
        })
      ),
      signOut: vi.fn().mockImplementation(() => {
        currentUser = null;
        currentSession = null;
        return Promise.resolve({ error: null });
      }),
      resetPasswordForEmail: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: {}, error: null })
      ),
      updateUser: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: { user: currentUser },
          error: null,
        })
      ),
      onAuthStateChange: vi.fn().mockImplementation((callback) => {
        // Immediately call with current state
        callback('SIGNED_IN', currentSession);
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
    },
    from: vi.fn().mockImplementation((table: string) => createQueryBuilder(table)),
    storage: {
      from: vi.fn().mockImplementation(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/mock-path' },
        }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.example.com/signed-url' },
          error: null,
        }),
      })),
    },
    rpc: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn().mockImplementation(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })),
    removeChannel: vi.fn(),
  };
}

// The default mock instance
export const mockSupabase = createMockSupabaseClient();

// Reset all mocks to initial state
export function resetSupabaseMocks(): void {
  clearMockResponses();
  setMockAuthenticated(true);
  vi.clearAllMocks();
}
