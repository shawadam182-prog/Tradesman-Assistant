import { supabase } from '../lib/supabase';
import { isAdminUser } from '../lib/constants';

export interface TrialUserAnalytics {
  user_id: string;
  user_email: string | null;
  company_name: string | null;
  trial_start: string | null;
  trial_end: string | null;
  converted: boolean;
  converted_at: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  referral_code: string | null;
  // Session metrics
  total_logins: number;
  first_login: string | null;
  last_login: string | null;
  total_session_minutes: number;
  avg_session_minutes: number;
  // Activity metrics
  page_views: number;
  features_used: number;
  unique_features_used: number;
  most_used_feature: string | null;
  last_activity: string | null;
  // Recent activity
  activity_last_24h: number;
  activity_last_7d: number;
  // Calculated
  days_remaining: number | null;
  trial_status: 'active' | 'expired' | 'converted' | 'unknown';
  engagement_score: number;
}

export interface AnalyticsSummary {
  totalTrialUsers: number;
  activeToday: number;
  activeThisWeek: number;
  convertedUsers: number;
  conversionRate: number;
  avgEngagement: number;
  expiringSoon: number; // Within 3 days
}

export interface UserActivityLog {
  id: string;
  user_id: string;
  session_id: string | null;
  action_type: string;
  action_name: string;
  action_details: Record<string, any>;
  page_path: string | null;
  page_name: string | null;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_id: string;
  login_at: string;
  logout_at: string | null;
  session_duration_seconds: number | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  is_pwa: boolean;
}

export const adminAnalyticsService = {
  /**
   * Check if current user is admin
   */
  async isAdmin(): Promise<boolean> {
    const user = (await supabase.auth.getUser()).data.user;
    return isAdminUser(user?.id);
  },

  /**
   * Get all trial users analytics data
   */
  async getTrialUsersAnalytics(): Promise<TrialUserAnalytics[]> {
    if (!await this.isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { data, error } = await supabase
      .from('trial_users_analytics')
      .select('*')
      .order('engagement_score', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get summary statistics for the dashboard
   */
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    if (!await this.isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }

    const users = await this.getTrialUsersAnalytics();

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const totalTrialUsers = users.length;
    const convertedUsers = users.filter(u => u.converted).length;
    const activeToday = users.filter(u => u.last_login && u.last_login >= todayStart).length;
    const activeThisWeek = users.filter(u => u.last_login && u.last_login >= weekAgo).length;
    const avgEngagement = totalTrialUsers > 0
      ? Math.round(users.reduce((sum, u) => sum + u.engagement_score, 0) / totalTrialUsers)
      : 0;
    const expiringSoon = users.filter(u =>
      u.trial_status === 'active' &&
      u.days_remaining !== null &&
      u.days_remaining <= 3
    ).length;
    const conversionRate = totalTrialUsers > 0
      ? Math.round((convertedUsers / totalTrialUsers) * 100)
      : 0;

    return {
      totalTrialUsers,
      activeToday,
      activeThisWeek,
      convertedUsers,
      conversionRate,
      avgEngagement,
      expiringSoon,
    };
  },

  /**
   * Get activity logs for a specific user
   */
  async getUserActivityLogs(userId: string, limit = 50): Promise<UserActivityLog[]> {
    if (!await this.isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get sessions for a specific user
   */
  async getUserSessions(userId: string, limit = 20): Promise<UserSession[]> {
    if (!await this.isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('login_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get feature usage breakdown for a user
   */
  async getUserFeatureUsage(userId: string): Promise<{ feature: string; count: number }[]> {
    if (!await this.isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('action_name')
      .eq('user_id', userId)
      .eq('action_type', 'feature_used');

    if (error) throw error;

    // Count occurrences of each feature
    const counts: Record<string, number> = {};
    (data || []).forEach(row => {
      counts[row.action_name] = (counts[row.action_name] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * Get page views breakdown for a user
   */
  async getUserPageViews(userId: string): Promise<{ page: string; count: number }[]> {
    if (!await this.isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('page_name')
      .eq('user_id', userId)
      .eq('action_type', 'page_view');

    if (error) throw error;

    // Count occurrences of each page
    const counts: Record<string, number> = {};
    (data || []).forEach(row => {
      if (row.page_name) {
        counts[row.page_name] = (counts[row.page_name] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count);
  },
};
