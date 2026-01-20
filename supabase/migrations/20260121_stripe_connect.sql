-- ============================================
-- STRIPE CONNECT: Add connected account fields to user_settings
-- This migration adds support for Stripe Connect without affecting
-- existing subscription functionality.
-- ============================================

-- Add Stripe Connect fields to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_connect_onboarded_at TIMESTAMPTZ;

-- Add payment link fields to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS payment_link_url TEXT,
ADD COLUMN IF NOT EXISTS payment_link_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_link_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS online_payment_amount NUMERIC,
ADD COLUMN IF NOT EXISTS online_payment_fee NUMERIC,
ADD COLUMN IF NOT EXISTS online_payment_net NUMERIC;

-- Create index for payment lookups
CREATE INDEX IF NOT EXISTS idx_quotes_stripe_checkout_session_id
ON quotes(stripe_checkout_session_id)
WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_settings_stripe_connect_account_id
ON user_settings(stripe_connect_account_id)
WHERE stripe_connect_account_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_settings.stripe_connect_account_id IS 'Stripe Connect account ID (acct_xxx) - separate from subscription customer';
COMMENT ON COLUMN user_settings.stripe_connect_onboarding_complete IS 'Whether user has completed Stripe Connect onboarding';
COMMENT ON COLUMN user_settings.stripe_connect_charges_enabled IS 'Whether the connected account can accept charges';
COMMENT ON COLUMN user_settings.stripe_connect_payouts_enabled IS 'Whether the connected account can receive payouts';

COMMENT ON COLUMN quotes.stripe_payment_intent_id IS 'Stripe Payment Intent ID for online payments';
COMMENT ON COLUMN quotes.stripe_checkout_session_id IS 'Stripe Checkout Session ID for tracking';
COMMENT ON COLUMN quotes.payment_link_url IS 'Customer-facing payment URL';
COMMENT ON COLUMN quotes.online_payment_amount IS 'Total amount paid online';
COMMENT ON COLUMN quotes.online_payment_fee IS 'Stripe fee charged';
COMMENT ON COLUMN quotes.online_payment_net IS 'Net amount received by tradesperson';
