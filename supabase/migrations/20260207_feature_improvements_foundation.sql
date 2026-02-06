-- ============================================================
-- Phase 0: Feature Improvements Foundation
-- New tables for signatures, milestones, email, materials, comms
-- All additive — no ALTER/DROP of existing columns/tables
-- ============================================================

-- 1. quote_signatures (Phase 1: Digital Signatures)
CREATE TABLE IF NOT EXISTS quote_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signature_data TEXT NOT NULL,       -- base64 PNG
  signature_type TEXT DEFAULT 'draw', -- 'draw' | 'type'
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_signatures_quote_id ON quote_signatures(quote_id);

-- RLS for quote_signatures
ALTER TABLE quote_signatures ENABLE ROW LEVEL SECURITY;

-- Quote owners can read signatures on their quotes
CREATE POLICY "Users can read signatures on their quotes"
  ON quote_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes q WHERE q.id = quote_signatures.quote_id AND q.user_id = auth.uid()
    )
  );

-- Public insert for customers signing via share link (no auth required)
CREATE POLICY "Anyone can insert a signature via share token"
  ON quote_signatures FOR INSERT
  WITH CHECK (true);


-- 2. payment_milestones (Phase 3: Proper table, not JSONB)
CREATE TABLE IF NOT EXISTS payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  label TEXT NOT NULL,
  percentage NUMERIC,
  fixed_amount NUMERIC,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid')),
  invoice_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_milestones_quote_id ON payment_milestones(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_user_id ON payment_milestones(user_id);

-- RLS for payment_milestones
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own milestones"
  ON payment_milestones FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 3. email_templates (Phase 2: Lazy-initialized per user)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,                 -- supports {{variable}} syntax
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, template_type, is_default)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);

-- RLS for email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates"
  ON email_templates FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 4. email_log (Phase 2: With retry support)
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  template_type TEXT,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'failed', 'bounced')),
  resend_message_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_user_id ON email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_quote_id ON email_log(quote_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status);

-- RLS for email_log
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own email log"
  ON email_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own email log"
  ON email_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own email log"
  ON email_log FOR UPDATE
  USING (user_id = auth.uid());


-- 5. communication_preferences (Phase 2/3/5: Lazy-initialized)
CREATE TABLE IF NOT EXISTS communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  payment_reminder_enabled BOOLEAN DEFAULT true,
  payment_reminder_days INTEGER[] DEFAULT '{7,14,30}',
  appointment_reminder_enabled BOOLEAN DEFAULT true,
  appointment_reminder_hours INTEGER DEFAULT 24,
  quote_follow_up_enabled BOOLEAN DEFAULT false,
  quote_follow_up_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for communication_preferences
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
  ON communication_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 6. material_kits (Phase 6: Reusable material bundles)
CREATE TABLE IF NOT EXISTS material_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  category TEXT,
  is_favourite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_kits_user_id ON material_kits(user_id);

-- RLS for material_kits
ALTER TABLE material_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own kits"
  ON material_kits FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 7. Additive column on quotes for view tracking
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;


-- 8. Update get_quote_by_share_token to increment view_count and return signature
-- Drop the old UUID-typed overload first (PostgreSQL identifies functions by name + param types)
DROP FUNCTION IF EXISTS get_quote_by_share_token(UUID);

CREATE OR REPLACE FUNCTION get_quote_by_share_token(p_share_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote RECORD;
  v_customer RECORD;
  v_settings RECORD;
  v_signature RECORD;
BEGIN
  -- Find the quote by share token (cast text to uuid for comparison)
  SELECT * INTO v_quote
  FROM quotes
  WHERE share_token = p_share_token::UUID;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote not found or link has expired');
  END IF;

  -- Increment view count
  UPDATE quotes SET view_count = COALESCE(view_count, 0) + 1 WHERE id = v_quote.id;

  -- Get customer info (limited fields for privacy)
  SELECT id, name, company INTO v_customer
  FROM customers
  WHERE id = v_quote.customer_id;

  -- Get user settings (company info for display)
  SELECT
    company_name, company_address, company_logo_path,
    phone, email, footer_logos
  INTO v_settings
  FROM user_settings
  WHERE user_id = v_quote.user_id;

  -- Get signature if exists
  SELECT * INTO v_signature
  FROM quote_signatures
  WHERE quote_id = v_quote.id
  ORDER BY signed_at DESC
  LIMIT 1;

  -- Build result matching the original return structure
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
      'declined_at', v_quote.declined_at,
      'view_count', v_quote.view_count
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
    END,
    'signature', CASE
      WHEN v_signature IS NOT NULL THEN jsonb_build_object(
        'id', v_signature.id,
        'signer_name', v_signature.signer_name,
        'signature_data', v_signature.signature_data,
        'signature_type', v_signature.signature_type,
        'signed_at', v_signature.signed_at
      )
      ELSE NULL
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_quote_by_share_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_quote_by_share_token(TEXT) TO authenticated;


-- 9. Update respond_to_quote to accept signature params
-- Drop the old UUID-typed overload first
DROP FUNCTION IF EXISTS respond_to_quote(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION respond_to_quote(
  p_share_token TEXT,
  p_response TEXT,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_signature_data TEXT DEFAULT NULL,
  p_signer_name TEXT DEFAULT NULL,
  p_signature_type TEXT DEFAULT 'draw'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote_id UUID;
  v_current_status TEXT;
  v_customer_response TEXT;
BEGIN
  -- Find quote by share token
  SELECT id, status, customer_response INTO v_quote_id, v_current_status, v_customer_response
  FROM quotes
  WHERE share_token = p_share_token::UUID;

  IF v_quote_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote not found');
  END IF;

  -- Check if already responded
  IF v_current_status NOT IN ('sent', 'draft') THEN
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

  -- Update quote with response
  UPDATE quotes SET
    status = p_response,
    customer_response = p_response,
    customer_response_at = NOW(),
    customer_response_ip = p_ip,
    customer_response_user_agent = p_user_agent,
    accepted_at = CASE WHEN p_response = 'accepted' THEN NOW() ELSE NULL END,
    declined_at = CASE WHEN p_response = 'declined' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = v_quote_id;

  -- If accepted and signature provided, save it
  IF p_response = 'accepted' AND p_signature_data IS NOT NULL AND p_signer_name IS NOT NULL THEN
    INSERT INTO quote_signatures (quote_id, signer_name, signature_data, signature_type, ip_address, user_agent)
    VALUES (v_quote_id, p_signer_name, p_signature_data, p_signature_type, p_ip, p_user_agent);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'quote_id', v_quote_id,
    'new_status', p_response,
    'responded_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION respond_to_quote(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION respond_to_quote(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
