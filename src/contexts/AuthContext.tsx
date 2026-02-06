import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getReferralCode, clearReferralCode } from '../hooks/useReferralCapture';
import { APP_CONFIG } from '../lib/constants';
import { activityService } from '../services/activityService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const hasRecordedLogin = useRef(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Record login for existing session on page load
      if (session?.user && !hasRecordedLogin.current) {
        hasRecordedLogin.current = true;
        activityService.recordLogin().catch(console.error);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Track login/logout events
        if (event === 'SIGNED_IN' && session?.user && !hasRecordedLogin.current) {
          hasRecordedLogin.current = true;
          activityService.recordLogin().catch(console.error);
        } else if (event === 'SIGNED_OUT') {
          hasRecordedLogin.current = false;
          activityService.recordLogout().catch(console.error);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    // Get referral code before signup (if any)
    const referralCode = getReferralCode();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    // If signup successful, initialize trial with business tier (full access)
    if (!error && data.user) {
      try {
        // Calculate trial dates
        const now = new Date();
        const trialEnd = new Date(now.getTime() + APP_CONFIG.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

        // Use upsert to handle both new and existing settings records
        // This also handles race conditions with any DB triggers
        setTimeout(async () => {
          const { error: settingsError } = await supabase
            .from('user_settings')
            .upsert({
              user_id: data.user!.id,
              referral_code: referralCode || null,
              trial_start: now.toISOString(),
              trial_end: trialEnd.toISOString(),
              subscription_tier: 'business',      // Full access during trial
              subscription_status: 'trialing',
            }, { onConflict: 'user_id' });

          if (settingsError) {
            console.error('Failed to initialize trial settings:', settingsError);
          } else {
            if (referralCode) {
              clearReferralCode();
            }
          }
        }, 1000);
      } catch (err) {
        console.error('Error initializing trial:', err);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    // Record logout before signing out
    await activityService.recordLogout().catch(console.error);
    hasRecordedLogin.current = false;
    // Clear local state first (handles mock login scenario)
    setUser(null);
    setSession(null);
    // Also sign out from Supabase in case real auth is used
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
