import { prisma } from '@/lib/prisma';
import { ReferralStatus } from '@/generated/prisma/client';
import { logReferralAudit } from './referral-audit.service';

export interface RecordAttributionParams {
  referralCode: string;
  candidateEmail: string;
  candidateName?: string;
  candidatePhone?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Validates a referral code and checks self-referral constraints.
 */
export async function validateReferralCodeEligibility(
  code: string,
  candidateEmail?: string
): Promise<{ valid: boolean; error?: string; referrerId?: string; referralCodeId?: string; referrerName?: string }> {
  const normalized = code.trim().toUpperCase();
  const refCode = await prisma.referralCode.findUnique({
    where: { code: normalized },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          studentProfile: {
            select: {
              parentPhone: true,
            },
          },
        },
      },
    },
  });

  if (!refCode || !refCode.isActive) {
    return { valid: false, error: 'Invalid or inactive referral code.' };
  }

  // Self-referral prevention by email
  if (candidateEmail && refCode.user.email.toLowerCase() === candidateEmail.trim().toLowerCase()) {
    return { valid: false, error: 'You cannot use your own referral code.' };
  }

  return {
    valid: true,
    referrerId: refCode.userId,
    referralCodeId: refCode.id,
    referrerName: refCode.user.name,
  };
}

/**
 * Stages an attribution at signup attempt or links to existing lead.
 */
export async function stageSignupAttribution(params: RecordAttributionParams): Promise<{ success: boolean; error?: string }> {
  const validation = await validateReferralCodeEligibility(params.referralCode, params.candidateEmail);
  if (!validation.valid || !validation.referrerId || !validation.referralCodeId) {
    return { success: false, error: validation.error || 'Invalid code.' };
  }

  const email = params.candidateEmail.trim().toLowerCase();

  // Check if candidate is already attributed
  const existing = await prisma.referralAttribution.findFirst({
    where: { candidateEmail: email },
  });

  if (existing) {
    return { success: true }; // Attribution is already recorded and locked
  }

  const attribution = await prisma.referralAttribution.create({
    data: {
      referrerId: validation.referrerId,
      referralCodeId: validation.referralCodeId,
      referralCodeSnapshot: params.referralCode.trim().toUpperCase(),
      status: ReferralStatus.PENDING,
      candidateEmail: email,
      candidateName: params.candidateName?.trim(),
      candidatePhone: params.candidatePhone?.trim(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });

  // Increment clicks/usage counter on code
  await prisma.referralCode.update({
    where: { id: validation.referralCodeId },
    data: { clickCount: { increment: 1 } },
  });

  await logReferralAudit({
    attributionId: attribution.id,
    action: 'ATTRIBUTION_STAGED',
    newState: ReferralStatus.PENDING,
    reason: `Candidate ${email} registered intent with code ${params.referralCode}`,
  });

  return { success: true };
}

/**
 * Links a verified User account to their staged attribution upon OTP verification.
 */
export async function finalizeSignupAttribution(userId: string, email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const attribution = await prisma.referralAttribution.findFirst({
    where: {
      candidateEmail: normalizedEmail,
      referredUserId: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!attribution) {
    return;
  }

  // Prevent self-referral if user is the referrer
  if (attribution.referrerId === userId) {
    await prisma.referralAttribution.update({
      where: { id: attribution.id },
      data: {
        status: ReferralStatus.DISQUALIFIED,
        disqualifiedAt: new Date(),
        disqualificationReason: 'Self-referral detected',
      },
    });
    await logReferralAudit({
      attributionId: attribution.id,
      action: 'DISQUALIFIED_SELF_REFERRAL',
      previousState: attribution.status,
      newState: ReferralStatus.DISQUALIFIED,
      reason: 'User verified with own referral code',
    });
    return;
  }

  await prisma.referralAttribution.update({
    where: { id: attribution.id },
    data: {
      referredUserId: userId,
      status: ReferralStatus.REGISTERED,
      registeredAt: new Date(),
    },
  });

  await logReferralAudit({
    attributionId: attribution.id,
    action: 'ATTRIBUTION_REGISTERED',
    previousState: attribution.status,
    newState: ReferralStatus.REGISTERED,
    reason: `Candidate successfully verified account (User ID: ${userId})`,
  });
}

