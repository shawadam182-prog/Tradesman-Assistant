import { useEffect, useCallback } from 'react';
import { APP_CONFIG } from '../lib/constants';

const REFERRAL_STORAGE_KEY = 'tradesync_referral_code';
const REFERRAL_TIMESTAMP_KEY = 'tradesync_referral_captured_at';

/**
 * Hook to capture referral codes from URLs
 *
 * Handles URLs like:
 * - /r/wholesaler123
 * - ?ref=abc123
 *
 * Stores the referral code in localStorage for use during signup
 */
export function useReferralCapture(): void {
  useEffect(() => {
    // Check for /r/CODE pattern in the URL path
    const pathMatch = window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);

    // Also check for ?ref=CODE query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const queryRef = urlParams.get('ref');

    const referralCode = pathMatch?.[1] || queryRef;

    if (referralCode) {
      // Store referral code and timestamp
      localStorage.setItem(REFERRAL_STORAGE_KEY, referralCode);
      localStorage.setItem(REFERRAL_TIMESTAMP_KEY, new Date().toISOString());

      // Clean the URL by redirecting to home without the referral path/param
      const cleanUrl = window.location.origin + '/';
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);
}

/**
 * Get the stored referral code (if any and still valid)
 */
export function getReferralCode(): string | null {
  if (!isReferralCodeValid()) {
    clearReferralCode();
    return null;
  }
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
}

/**
 * Clear the stored referral code (call after successful signup)
 */
export function clearReferralCode(): void {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  localStorage.removeItem(REFERRAL_TIMESTAMP_KEY);
}

/**
 * Check if referral code is still valid (within validity period)
 */
export function isReferralCodeValid(): boolean {
  const capturedAt = localStorage.getItem(REFERRAL_TIMESTAMP_KEY);
  if (!capturedAt) return false;

  const capturedDate = new Date(capturedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - capturedDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysDiff <= APP_CONFIG.REFERRAL_VALIDITY_DAYS;
}

/**
 * Hook to get referral code with auto-validation
 */
export function useReferralCode(): string | null {
  return getReferralCode();
}
