import { vi } from 'vitest';
import type { SubscriptionTier, SubscriptionStatus } from '../../../types';

// Stripe types (simplified versions of actual Stripe types)
export interface MockCheckoutSession {
  id: string;
  object: 'checkout.session';
  mode: 'subscription' | 'payment' | 'setup';
  client_reference_id: string | null;
  customer: string | null;
  customer_email: string | null;
  subscription: string | null;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  status: 'open' | 'complete' | 'expired';
  success_url: string;
  cancel_url: string;
  url: string | null;
  metadata: Record<string, string>;
  created: number;
  expires_at: number;
}

export interface MockSubscription {
  id: string;
  object: 'subscription';
  customer: string;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  ended_at: number | null;
  trial_start: number | null;
  trial_end: number | null;
  items: {
    object: 'list';
    data: Array<{
      id: string;
      price: {
        id: string;
        product: string;
        unit_amount: number;
        currency: string;
        recurring: {
          interval: 'month' | 'year';
          interval_count: number;
        };
      };
    }>;
  };
  metadata: Record<string, string>;
  created: number;
}

export interface MockCustomer {
  id: string;
  object: 'customer';
  email: string | null;
  name: string | null;
  metadata: Record<string, string>;
  created: number;
}

export interface MockWebhookEvent {
  id: string;
  object: 'event';
  api_version: string;
  created: number;
  type: string;
  data: {
    object: unknown;
    previous_attributes?: Record<string, unknown>;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  } | null;
}

// Helper to create mock timestamps
function nowTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

function futureTimestamp(days: number): number {
  return nowTimestamp() + days * 24 * 60 * 60;
}

// Default mock values
const DEFAULT_CHECKOUT_SESSION: MockCheckoutSession = {
  id: 'cs_test_mock123',
  object: 'checkout.session',
  mode: 'subscription',
  client_reference_id: 'test-user-id',
  customer: 'cus_mock123',
  customer_email: 'test@example.com',
  subscription: 'sub_mock123',
  payment_status: 'paid',
  status: 'complete',
  success_url: 'https://app.example.com/settings?success=true',
  cancel_url: 'https://app.example.com/settings?canceled=true',
  url: 'https://checkout.stripe.com/c/pay/cs_test_mock123',
  metadata: { userId: 'test-user-id', tier: 'professional' },
  created: nowTimestamp(),
  expires_at: futureTimestamp(1),
};

const DEFAULT_SUBSCRIPTION: MockSubscription = {
  id: 'sub_mock123',
  object: 'subscription',
  customer: 'cus_mock123',
  status: 'active',
  current_period_start: nowTimestamp(),
  current_period_end: futureTimestamp(30),
  cancel_at_period_end: false,
  canceled_at: null,
  ended_at: null,
  trial_start: null,
  trial_end: null,
  items: {
    object: 'list',
    data: [
      {
        id: 'si_mock123',
        price: {
          id: 'price_professional_monthly',
          product: 'prod_professional',
          unit_amount: 1499,
          currency: 'gbp',
          recurring: { interval: 'month', interval_count: 1 },
        },
      },
    ],
  },
  metadata: { userId: 'test-user-id' },
  created: nowTimestamp(),
};

const DEFAULT_CUSTOMER: MockCustomer = {
  id: 'cus_mock123',
  object: 'customer',
  email: 'test@example.com',
  name: 'Test User',
  metadata: { userId: 'test-user-id' },
  created: nowTimestamp(),
};

// Factory functions for creating mock objects
export function createMockCheckoutSession(
  overrides: Partial<MockCheckoutSession> = {}
): MockCheckoutSession {
  return { ...DEFAULT_CHECKOUT_SESSION, ...overrides };
}

export function createMockSubscription(
  overrides: Partial<MockSubscription> = {}
): MockSubscription {
  return { ...DEFAULT_SUBSCRIPTION, ...overrides };
}

export function createMockCustomer(
  overrides: Partial<MockCustomer> = {}
): MockCustomer {
  return { ...DEFAULT_CUSTOMER, ...overrides };
}

// Create a subscription with specific status
export function createMockSubscriptionWithStatus(
  status: MockSubscription['status'],
  overrides: Partial<MockSubscription> = {}
): MockSubscription {
  const statusOverrides: Partial<MockSubscription> = {};

  switch (status) {
    case 'trialing':
      statusOverrides.trial_start = nowTimestamp();
      statusOverrides.trial_end = futureTimestamp(14);
      break;
    case 'canceled':
      statusOverrides.canceled_at = nowTimestamp();
      statusOverrides.ended_at = nowTimestamp();
      break;
    case 'past_due':
      statusOverrides.current_period_end = nowTimestamp() - 86400; // Yesterday
      break;
  }

  return createMockSubscription({ status, ...statusOverrides, ...overrides });
}

// Create a subscription for a specific tier
export function createMockSubscriptionForTier(
  tier: SubscriptionTier,
  overrides: Partial<MockSubscription> = {}
): MockSubscription {
  const priceMap: Record<SubscriptionTier, { id: string; product: string; amount: number }> = {
    free: { id: 'price_free', product: 'prod_free', amount: 0 },
    professional: { id: 'price_professional_monthly', product: 'prod_professional', amount: 1499 },
    business: { id: 'price_business_monthly', product: 'prod_business', amount: 2999 },
    team: { id: 'price_team_monthly', product: 'prod_team', amount: 2999 },
  };

  const priceInfo = priceMap[tier];

  return createMockSubscription({
    items: {
      object: 'list',
      data: [
        {
          id: `si_${tier}_mock`,
          price: {
            id: priceInfo.id,
            product: priceInfo.product,
            unit_amount: priceInfo.amount,
            currency: 'gbp',
            recurring: { interval: 'month', interval_count: 1 },
          },
        },
      ],
    },
    metadata: { tier },
    ...overrides,
  });
}

// Webhook event construction
export function createMockWebhookEvent(
  type: string,
  data: unknown,
  overrides: Partial<MockWebhookEvent> = {}
): MockWebhookEvent {
  return {
    id: `evt_mock_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: nowTimestamp(),
    type,
    data: { object: data },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    ...overrides,
  };
}

// Common webhook event factories
export function createCheckoutCompletedEvent(
  session: MockCheckoutSession = DEFAULT_CHECKOUT_SESSION
): MockWebhookEvent {
  return createMockWebhookEvent('checkout.session.completed', session);
}

export function createSubscriptionCreatedEvent(
  subscription: MockSubscription = DEFAULT_SUBSCRIPTION
): MockWebhookEvent {
  return createMockWebhookEvent('customer.subscription.created', subscription);
}

export function createSubscriptionUpdatedEvent(
  subscription: MockSubscription = DEFAULT_SUBSCRIPTION,
  previousAttributes: Record<string, unknown> = {}
): MockWebhookEvent {
  return createMockWebhookEvent('customer.subscription.updated', subscription, {
    data: { object: subscription, previous_attributes: previousAttributes },
  });
}

export function createSubscriptionDeletedEvent(
  subscription: MockSubscription
): MockWebhookEvent {
  const deletedSub = { ...subscription, status: 'canceled' as const, ended_at: nowTimestamp() };
  return createMockWebhookEvent('customer.subscription.deleted', deletedSub);
}

export function createInvoicePaidEvent(
  customerId: string = 'cus_mock123',
  subscriptionId: string = 'sub_mock123'
): MockWebhookEvent {
  return createMockWebhookEvent('invoice.paid', {
    id: `in_mock_${Date.now()}`,
    object: 'invoice',
    customer: customerId,
    subscription: subscriptionId,
    status: 'paid',
    amount_paid: 1499,
    currency: 'gbp',
  });
}

export function createPaymentFailedEvent(
  customerId: string = 'cus_mock123',
  subscriptionId: string = 'sub_mock123'
): MockWebhookEvent {
  return createMockWebhookEvent('invoice.payment_failed', {
    id: `in_mock_${Date.now()}`,
    object: 'invoice',
    customer: customerId,
    subscription: subscriptionId,
    status: 'open',
    amount_due: 1499,
    currency: 'gbp',
  });
}

// Mock Stripe client
export function createMockStripeClient() {
  return {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue(DEFAULT_CHECKOUT_SESSION),
        retrieve: vi.fn().mockResolvedValue(DEFAULT_CHECKOUT_SESSION),
      },
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue(DEFAULT_SUBSCRIPTION),
      update: vi.fn().mockResolvedValue(DEFAULT_SUBSCRIPTION),
      cancel: vi.fn().mockResolvedValue({ ...DEFAULT_SUBSCRIPTION, status: 'canceled' }),
    },
    customers: {
      create: vi.fn().mockResolvedValue(DEFAULT_CUSTOMER),
      retrieve: vi.fn().mockResolvedValue(DEFAULT_CUSTOMER),
      update: vi.fn().mockResolvedValue(DEFAULT_CUSTOMER),
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'bps_mock123',
          url: 'https://billing.stripe.com/session/mock123',
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn().mockImplementation(
        (payload: string, signature: string, secret: string) => {
          // Parse payload and return as event
          const data = JSON.parse(payload);
          return createMockWebhookEvent(data.type || 'test.event', data.data?.object || {});
        }
      ),
    },
  };
}

// Default mock instance
export const mockStripe = createMockStripeClient();

// Helper to reset all Stripe mocks
export function resetStripeMocks(): void {
  vi.clearAllMocks();
}

// Helper to make checkout session creation return a specific session
export function setCheckoutSessionResponse(session: MockCheckoutSession): void {
  mockStripe.checkout.sessions.create.mockResolvedValue(session);
  mockStripe.checkout.sessions.retrieve.mockResolvedValue(session);
}

// Helper to make subscription retrieval return a specific subscription
export function setSubscriptionResponse(subscription: MockSubscription): void {
  mockStripe.subscriptions.retrieve.mockResolvedValue(subscription);
  mockStripe.subscriptions.update.mockResolvedValue(subscription);
}
