-- ============================================
-- USER ACTIVITY TRACKING: Add user_sessions and user_activity_logs tables
-- These tables track user login/logout events and app usage analytics
-- ============================================

-- Create user_sessions table to track login/logout events
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  session_duration_seconds INTEGER,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  is_pwa BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_activity_logs table to track feature usage and page views
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  action_type TEXT NOT NULL,
  action_name TEXT NOT NULL,
  page_path TEXT,
  page_name TEXT,
  action_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
ON user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id
ON user_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_login_at
ON user_sessions(login_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id
ON user_activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_session_id
ON user_activity_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action_type
ON user_activity_logs(action_type);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at
ON user_activity_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_sessions
-- Users can only read their own sessions
CREATE POLICY "Users can read own sessions"
ON user_sessions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
ON user_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
ON user_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Create RLS policies for user_activity_logs
-- Users can only read their own activity logs
CREATE POLICY "Users can read own activity logs"
ON user_activity_logs FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own activity logs
CREATE POLICY "Users can insert own activity logs"
ON user_activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE user_sessions IS 'Tracks user login/logout sessions with device information';
COMMENT ON TABLE user_activity_logs IS 'Tracks user actions, page views, and feature usage for analytics';

COMMENT ON COLUMN user_sessions.session_id IS 'Client-side session ID for tracking user session';
COMMENT ON COLUMN user_sessions.login_at IS 'Timestamp when user logged in';
COMMENT ON COLUMN user_sessions.logout_at IS 'Timestamp when user logged out (null if still active)';
COMMENT ON COLUMN user_sessions.session_duration_seconds IS 'Duration of session in seconds';
COMMENT ON COLUMN user_sessions.is_pwa IS 'Whether user is using Progressive Web App';

COMMENT ON COLUMN user_activity_logs.action_type IS 'Type of action: page_view, feature_use, etc.';
COMMENT ON COLUMN user_activity_logs.action_name IS 'Name of the action performed';
COMMENT ON COLUMN user_activity_logs.action_details IS 'Additional JSON metadata about the action';
