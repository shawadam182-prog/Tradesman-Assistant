-- Credit Note support: additive columns on quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_credit_note BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS original_invoice_id UUID REFERENCES quotes(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS credit_note_reason TEXT;
