-- Admin functions for trial management
-- These functions are SECURITY DEFINER to bypass RLS and can only be called by admin users

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Only shawadam182@gmail.com is admin
  RETURN auth.uid() = '5ebbf6a3-1477-4d3f-a6e8-6795e26b4d1d'::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset a user's trial to a new end date
CREATE OR REPLACE FUNCTION admin_reset_trial(
  target_user_id UUID,
  new_trial_end TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  -- Check admin permission
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Update or insert user settings with new trial
  INSERT INTO user_settings (user_id, subscription_status, trial_end)
  VALUES (target_user_id, 'trialing', new_trial_end)
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_status = 'trialing',
    trial_end = new_trial_end,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Extend a user's trial by additional days
CREATE OR REPLACE FUNCTION admin_extend_trial(
  target_user_id UUID,
  extra_days INTEGER
)
RETURNS VOID AS $$
DECLARE
  current_end TIMESTAMPTZ;
  new_end TIMESTAMPTZ;
BEGIN
  -- Check admin permission
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get current trial end (or NOW if none)
  SELECT COALESCE(trial_end, NOW()) INTO current_end
  FROM user_settings
  WHERE user_id = target_user_id;

  -- If no settings exist, use NOW as base
  IF current_end IS NULL THEN
    current_end := NOW();
  END IF;

  -- If trial already expired, extend from NOW instead
  IF current_end < NOW() THEN
    current_end := NOW();
  END IF;

  new_end := current_end + (extra_days || ' days')::INTERVAL;

  -- Update or insert
  INSERT INTO user_settings (user_id, subscription_status, trial_end)
  VALUES (target_user_id, 'trialing', new_end)
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_status = 'trialing',
    trial_end = new_end,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (function checks admin internally)
GRANT EXECUTE ON FUNCTION admin_reset_trial TO authenticated;
GRANT EXECUTE ON FUNCTION admin_extend_trial TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;
