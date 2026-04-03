-- ============================================
-- TOOL INVENTORY - theft protection / asset register
-- ============================================

CREATE TABLE IF NOT EXISTS tool_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  make_model TEXT,
  serial_number TEXT,
  category TEXT,
  purchase_date DATE,
  purchase_price NUMERIC,
  notes TEXT,
  photo_storage_path TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_inventory_user ON tool_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_inventory_category ON tool_inventory(user_id, category);

ALTER TABLE tool_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tools"
  ON tool_inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tools"
  ON tool_inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tools"
  ON tool_inventory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tools"
  ON tool_inventory FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKET FOR TOOL PHOTOS
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('tool-photos', 'tool-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload tool photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tool-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view tool photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tool-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete tool photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tool-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_tool_inventory_updated_at
  BEFORE UPDATE ON tool_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
