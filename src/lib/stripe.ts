import { supabase } from './supabase';
import type { AppSettings } from '../../types';

// Stripe Price IDs (Live Mode)
export const STRIPE_PRICES = {
  professional: 'price_1SqyvEK6gNizuAaGquTjgPXM',
  business: 'price_1SqywGK6gNizuAaGnTi0Pek8',
  enterprise: 'price_1SqywzK6gNizuAaGmBTYOfKl',
} as const;

export type StripeTier = keyof typeof STRIPE_PRICES;

/**
 * Redirects the user to Stripe Checkout to subscribe to a plan.
 * @param tier - The subscription tier to subscribe to
 * @returns Promise that resolves when redirect starts, or rejects on error
 */
export async function redirectToCheckout(tier: StripeTier): Promise<void> {
  // Get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('You must be logged in to subscribe');
  }

  // Call the create-checkout edge function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        tier,
        successUrl: `${window.location.origin}/settings?checkout=success`,
        cancelUrl: `${window.location.origin}/settings?checkout=cancelled`,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  const { url } = await response.json();

  if (!url) {
    throw new Error('No checkout URL returned');
  }

  // Redirect to Stripe Checkout
  window.location.href = url;
}

/**
 * Redirects the user to Stripe Customer Portal to manage their subscription.
 * @returns Promise that resolves when redirect starts, or rejects on error
 */
export async function redirectToPortal(): Promise<void> {
  // Get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('You must be logged in to manage your subscription');
  }

  // Call the create-portal-session edge function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        returnUrl: `${window.location.origin}/settings`,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create portal session');
  }

  const { url } = await response.json();

  if (!url) {
    throw new Error('No portal URL returned');
  }

  // Redirect to Stripe Customer Portal
  window.location.href = url;
}

// ============================================
// STRIPE CONNECT FUNCTIONS (for invoice payments)
// ============================================

/**
 * Initiates Stripe Connect onboarding for accepting invoice payments.
 * Redirects to Stripe's hosted onboarding flow.
 */
export async function startConnectOnboarding(): Promise<void> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('You must be logged in to set up payments');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connect-account`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        refreshUrl: `${window.location.origin}/settings?connect=refresh`,
        returnUrl: `${window.location.origin}/settings?connect=complete`,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start payment setup');
  }

  const { url } = await response.json();

  if (!url) {
    throw new Error('No onboarding URL returned');
  }

  window.location.href = url;
}

/**
 * Creates a payment link for an invoice.
 * Returns the payment URL that can be shared with the customer.
 */
export async function createInvoicePaymentLink(params: {
  invoiceId: string;
  amount: number;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  invoiceReference: string;
}): Promise<{ url: string; sessionId: string; expiresAt: number }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('You must be logged in to create payment links');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-invoice-payment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...params,
        successUrl: `${window.location.origin}/payment-success?invoice=${params.invoiceId}`,
        cancelUrl: `${window.location.origin}/invoices?payment=cancelled`,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment link');
  }

  return response.json();
}

/**
 * Checks if the user has completed Stripe Connect setup.
 */
export function isConnectSetupComplete(settings: AppSettings): boolean {
  return !!(
    settings.stripeConnectAccountId &&
    settings.stripeConnectOnboardingComplete &&
    settings.stripeConnectChargesEnabled
  );
}

/**
 * Gets the Connect setup status for display in UI.
 */
export function getConnectStatus(settings: AppSettings): {
  status: 'not_started' | 'incomplete' | 'complete';
  message: string;
} {
  if (!settings.stripeConnectAccountId) {
    return {
      status: 'not_started',
      message: 'Set up card payments to get paid faster',
    };
  }

  if (!settings.stripeConnectOnboardingComplete) {
    return {
      status: 'incomplete',
      message: 'Complete your payment account setup',
    };
  }

  if (!settings.stripeConnectChargesEnabled) {
    return {
      status: 'incomplete',
      message: 'Your account is being reviewed by Stripe',
    };
  }

  return {
    status: 'complete',
    message: 'Card payments enabled',
  };
}
