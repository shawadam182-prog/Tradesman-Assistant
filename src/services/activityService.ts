import { supabase } from '../lib/supabase';

// Helper to detect device info from user agent
function parseUserAgent(ua: string): { deviceType: string; browser: string; os: string } {
  // Detect device type
  let deviceType = 'desktop';
  if (/Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua)) {
    if (/iPad|Tablet/i.test(ua)) {
      deviceType = 'tablet';
    } else {
      deviceType = 'mobile';
    }
  }

  // Detect browser
  let browser = 'Unknown';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/MSIE|Trident/i.test(ua)) {
    browser = 'Internet Explorer';
  }

  // Detect OS
  let os = 'Unknown';
  if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Mac OS|Macintosh/i.test(ua)) {
    os = 'macOS';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  return { deviceType, browser, os };
}

// Detect if running as PWA
function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
}

// Generate or retrieve session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('tradesync_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('tradesync_session_id', sessionId);
  }
  return sessionId;
}

// Track when session started for duration calculation
let sessionStartTime: number | null = null;

export const activityService = {
  /**
   * Record a login event - creates a new session record
   */
  async recordLogin(): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const sessionId = getSessionId();
      const userAgent = navigator.userAgent;
      const { deviceType, browser, os } = parseUserAgent(userAgent);

      // Store session start time for duration calculation
      sessionStartTime = Date.now();

      const { error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          login_at: new Date().toISOString(),
          user_agent: userAgent,
          device_type: deviceType,
          browser: browser,
          os: os,
          is_pwa: isPWA(),
        });

      if (error) {
        console.error('Failed to record login:', error);
      }
    } catch (err) {
      console.error('Error recording login:', err);
    }
  },

  /**
   * Record a logout event - updates the session with logout time and duration
   */
  async recordLogout(): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const sessionId = sessionStorage.getItem('tradesync_session_id');
      if (!sessionId) return;

      // Calculate session duration
      let durationSeconds: number | null = null;
      if (sessionStartTime) {
        durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      }

      const { error } = await supabase
        .from('user_sessions')
        .update({
          logout_at: new Date().toISOString(),
          session_duration_seconds: durationSeconds,
        })
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .is('logout_at', null);

      if (error) {
        console.error('Failed to record logout:', error);
      }

      // Clear session ID
      sessionStorage.removeItem('tradesync_session_id');
      sessionStartTime = null;
    } catch (err) {
      console.error('Error recording logout:', err);
    }
  },

  /**
   * Log a page view
   */
  async logPageView(pagePath: string, pageName: string): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const sessionId = sessionStorage.getItem('tradesync_session_id');

      const { error } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          action_type: 'page_view',
          action_name: pageName,
          page_path: pagePath,
          page_name: pageName,
        });

      if (error) {
        console.error('Failed to log page view:', error);
      }
    } catch (err) {
      console.error('Error logging page view:', err);
    }
  },

  /**
   * Log a feature usage event
   */
  async logFeatureUsed(featureName: string, details?: Record<string, any>): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const sessionId = sessionStorage.getItem('tradesync_session_id');

      const { error } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          action_type: 'feature_used',
          action_name: featureName,
          action_details: details || {},
        });

      if (error) {
        console.error('Failed to log feature usage:', error);
      }
    } catch (err) {
      console.error('Error logging feature usage:', err);
    }
  },

  /**
   * Log a button click or other UI interaction
   */
  async logButtonClick(buttonName: string, details?: Record<string, any>): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const sessionId = sessionStorage.getItem('tradesync_session_id');

      const { error } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          action_type: 'button_click',
          action_name: buttonName,
          action_details: details || {},
        });

      if (error) {
        console.error('Failed to log button click:', error);
      }
    } catch (err) {
      console.error('Error logging button click:', err);
    }
  },

  /**
   * Get current session ID
   */
  getSessionId,
};
