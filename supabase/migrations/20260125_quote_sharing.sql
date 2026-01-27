-- Quote Sharing Feature
-- Allows customers to view and accept/decline quotes via a unique shareable link

-- Add share_token column for unique shareable links
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE DEFAULT NULL;

-- Add acceptance tracking columns
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ DEFAULT NULL;

-- Add audit trail columns for customer response
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_response_ip TEXT DEFAULT NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_response_user_agent TEXT DEFAULT NULL;

-- Create index on share_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_quotes_share_token ON quotes(share_token) WHERE share_token IS NOT NULL;

-- Function to generate share token when quote is marked as sent
CREATE OR REPLACE FUNCTION generate_share_token_on_send()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate token when status changes to 'sent' and token doesn't exist
  IF NEW.status = 'sent' AND OLD.status != 'sent' AND NEW.share_token IS NULL THEN
    NEW.share_token = uuid_generate_v4();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate share token
DROP TRIGGER IF EXISTS generate_share_token_trigger ON quotes;
CREATE TRIGGER generate_share_token_trigger
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION generate_share_token_on_send();

-- ============================================
-- PUBLIC ACCESS RLS POLICIES
-- These allow unauthenticated users to view quotes via share_token
-- ============================================

-- Drop existing policies if they exist (clean slate)
DROP POLICY IF EXISTS "Public can view quotes with share_token" ON quotes;
DROP POLICY IF EXISTS "Public can view shared quotes" ON quotes;
DROP POLICY IF EXISTS "Public can respond to shared quotes" ON quotes;

-- Policy: Allow viewing quotes - either owner OR has share token
-- Note: We keep the existing owner policies and just ensure shared quotes are viewable
CREATE POLICY "Public can view shared quotes" ON quotes
  FOR SELECT
  USING (
    -- Either user owns the quote OR quote has a share token (public access)
    auth.uid() = user_id
    OR share_token IS NOT NULL
  );

-- Policy: Allow public to update quotes that have a share_token
-- The actual field restrictions are enforced by the respond_to_quote function
CREATE POLICY "Public can respond to shared quotes" ON quotes
  FOR UPDATE
  USING (share_token IS NOT NULL)
  WITH CHECK (share_token IS NOT NULL);

-- ============================================
-- HELPER FUNCTION FOR PUBLIC QUOTE RESPONSE
-- ============================================

-- Function to safely accept/decline a quote via share token
CREATE OR REPLACE FUNCTION respond_to_quote(
  p_share_token UUID,
  p_response TEXT, -- 'accepted' or 'declined'
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_quote_id UUID;
  v_current_status TEXT;
  v_result JSONB;
BEGIN
  -- Find the quote by share token
  SELECT id, status INTO v_quote_id, v_current_status
  FROM quotes
  WHERE share_token = p_share_token;

  -- Check if quote exists
  IF v_quote_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote not found');
  END IF;

  -- Check if quote is in a valid state to respond (must be 'sent')
  IF v_current_status != 'sent' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quote has already been ' || v_current_status,
      'current_status', v_current_status
    );
  END IF;

  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid response. Must be accepted or declined.');
  END IF;

  -- Update the quote
  UPDATE quotes
  SET
    status = p_response,
    accepted_at = CASE WHEN p_response = 'accepted' THEN NOW() ELSE NULL END,
    declined_at = CASE WHEN p_response = 'declined' THEN NOW() ELSE NULL END,
    customer_response_ip = p_ip,
    customer_response_user_agent = p_user_agent,
    updated_at = NOW()
  WHERE id = v_quote_id;

  RETURN jsonb_build_object(
    'success', true,
    'quote_id', v_quote_id,
    'new_status', p_response,
    'responded_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon role (public access)
GRANT EXECUTE ON FUNCTION respond_to_quote(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION respond_to_quote(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================
-- FUNCTION TO GET QUOTE BY SHARE TOKEN (PUBLIC)
-- ============================================

CREATE OR REPLACE FUNCTION get_quote_by_share_token(p_share_token UUID)
RETURNS JSONB AS $$
DECLARE
  v_quote RECORD;
  v_customer RECORD;
  v_settings RECORD;
BEGIN
  -- Get the quote
  SELECT * INTO v_quote
  FROM quotes
  WHERE share_token = p_share_token;

  IF v_quote IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote not found or link has expired');
  END IF;

  -- Get customer info (limited fields for privacy)
  SELECT id, name, company INTO v_customer
  FROM customers
  WHERE id = v_quote.customer_id;

  -- Get company settings (for branding on public view)
  SELECT
    company_name, company_address, company_logo_path,
    phone, email, footer_logos
  INTO v_settings
  FROM user_settings
  WHERE user_id = v_quote.user_id;

  RETURN jsonb_build_object(
    'success', true,
    'quote', jsonb_build_object(
      'id', v_quote.id,
      'title', v_quote.title,
      'type', v_quote.type,
      'status', v_quote.status,
      'date', v_quote.date,
      'due_date', v_quote.due_date,
      'sections', v_quote.sections,
      'labour_rate', v_quote.labour_rate,
      'markup_percent', v_quote.markup_percent,
      'tax_percent', v_quote.tax_percent,
      'cis_percent', v_quote.cis_percent,
      'notes', v_quote.notes,
      'display_options', v_quote.display_options,
      'reference_number', v_quote.reference_number,
      'job_address', v_quote.job_address,
      'discount_type', v_quote.discount_type,
      'discount_value', v_quote.discount_value,
      'discount_description', v_quote.discount_description,
      'part_payment_enabled', v_quote.part_payment_enabled,
      'part_payment_type', v_quote.part_payment_type,
      'part_payment_value', v_quote.part_payment_value,
      'part_payment_label', v_quote.part_payment_label,
      'accepted_at', v_quote.accepted_at,
      'declined_at', v_quote.declined_at
    ),
    'customer', CASE
      WHEN v_customer IS NOT NULL THEN jsonb_build_object(
        'id', v_customer.id,
        'name', v_customer.name,
        'company', v_customer.company
      )
      ELSE NULL
    END,
    'company', CASE
      WHEN v_settings IS NOT NULL THEN jsonb_build_object(
        'name', v_settings.company_name,
        'address', v_settings.company_address,
        'logo_path', v_settings.company_logo_path,
        'phone', v_settings.phone,
        'email', v_settings.email,
        'footer_logos', v_settings.footer_logos
      )
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon (public access)
GRANT EXECUTE ON FUNCTION get_quote_by_share_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_quote_by_share_token(UUID) TO authenticated;

-- ============================================
-- FUNCTION TO GENERATE SHARE TOKEN ON DEMAND
-- For quotes that are already 'sent' but don't have a token
-- ============================================

CREATE OR REPLACE FUNCTION generate_share_token(p_quote_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_quote RECORD;
  v_new_token UUID;
BEGIN
  -- Get the quote
  SELECT id, status, share_token, user_id INTO v_quote
  FROM quotes
  WHERE id = p_quote_id;

  -- Check if quote exists
  IF v_quote.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote not found');
  END IF;

  -- Check if user owns the quote (RLS should handle this, but double-check)
  IF v_quote.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check if quote already has a token
  IF v_quote.share_token IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'share_token', v_quote.share_token,
      'message', 'Token already exists'
    );
  END IF;

  -- Generate new token
  v_new_token := uuid_generate_v4();

  -- Update the quote
  UPDATE quotes
  SET share_token = v_new_token, updated_at = NOW()
  WHERE id = p_quote_id;

  RETURN jsonb_build_object(
    'success', true,
    'share_token', v_new_token,
    'message', 'Token generated'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION generate_share_token(UUID) TO authenticated;
