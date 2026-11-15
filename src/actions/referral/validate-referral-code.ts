'use server';

import { validateReferralCodeEligibility } from '@/services/referral/attribution.service';

export async function validateReferralCode(code: string, email?: string) {
  if (!code || code.trim().length < 3) {
    return { valid: false, error: 'Code must be at least 3 characters long.' };
  }

  const result = await validateReferralCodeEligibility(code, email);
  if (!result.valid) {
    return { valid: false, error: result.error || 'Invalid referral code.' };
  }

  return {
    valid: true,
    referrerName: result.referrerName,
    code: code.trim().toUpperCase(),
  };
}

