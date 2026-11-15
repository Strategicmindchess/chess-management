import { prisma } from '@/lib/prisma';
import { ReferralStatus, FeeStatus, RewardClaimStatus } from '@/generated/prisma/client';
import { logReferralAudit } from './referral-audit.service';

/**
 * Evaluates whether a student meets the criteria to transition to JOINED_SUCCESSFULLY:
 * Criteria: 1st fee cycle is marked PAID AND student is enrolled in an active batch.
 */
export async function evaluateStudentReferralQualification(studentUserId: string): Promise<boolean> {
  // Find attribution for this student
  const attribution = await prisma.referralAttribution.findUnique({
    where: { referredUserId: studentUserId },
    include: {
      referredUser: {
        include: {
          studentProfile: {
            include: {
              feeConfig: {
                include: {
                  cycles: {
                    where: { status: FeeStatus.PAID },
                  },
                },
              },
              enrollments: {
                include: {
                  batch: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!attribution) {
    return false;
  }

  // If already qualified or finished, nothing to do
  if (
    attribution.status === ReferralStatus.JOINED_SUCCESSFULLY ||
    attribution.status === ReferralStatus.REWARD_APPROVED ||
    attribution.status === ReferralStatus.REWARD_DELIVERED ||
    attribution.status === ReferralStatus.DISQUALIFIED
  ) {
    return attribution.status === ReferralStatus.JOINED_SUCCESSFULLY;
  }

  const profile = attribution.referredUser?.studentProfile;
  if (!profile) {
    return false;
  }

  // 1. Fee verification: at least 1 cycle marked PAID
  const paidCycles = profile.feeConfig?.cycles ?? [];
  const hasPaidFee = paidCycles.length > 0;

  // 2. Batch enrollment: enrolled in at least 1 active batch
  const activeEnrollments = profile.enrollments.filter(e => e.batch?.isActive);
  const hasActiveBatch = activeEnrollments.length > 0;

  if (hasPaidFee && hasActiveBatch) {
    const previousState = attribution.status;
    const now = new Date();

    await prisma.referralAttribution.update({
      where: { id: attribution.id },
      data: {
        status: ReferralStatus.JOINED_SUCCESSFULLY,
        joinedAt: attribution.joinedAt || now,
        qualifiedAt: now,
      },
    });

    await logReferralAudit({
      attributionId: attribution.id,
      action: 'QUALIFIED_JOINED_SUCCESSFULLY',
      previousState,
      newState: ReferralStatus.JOINED_SUCCESSFULLY,
      reason: `Verified: ${paidCycles.length} paid fee cycle(s) & ${activeEnrollments.length} active batch enrollment(s)`,
    });

    return true;
  }

  return false;
}

/**
 * Handles clawback / disqualification if a referred student cancels or gets a fee refund.
 */
export async function handleStudentCancellationOrRefund(
  studentUserId: string,
  reason: string,
  actorId?: string
): Promise<void> {
  const attribution = await prisma.referralAttribution.findUnique({
    where: { referredUserId: studentUserId },
    include: {
      claimItems: {
        include: {
          rewardClaim: true,
        },
      },
    },
  });

  if (!attribution) {
    return;
  }

  const previousState = attribution.status;
  await prisma.referralAttribution.update({
    where: { id: attribution.id },
    data: {
      status: ReferralStatus.DISQUALIFIED,
      disqualifiedAt: new Date(),
      disqualificationReason: reason,
    },
  });

  await logReferralAudit({
    attributionId: attribution.id,
    actorId,
    action: 'DISQUALIFIED_REFUND_OR_CANCELLATION',
    previousState,
    newState: ReferralStatus.DISQUALIFIED,
    reason,
  });

  // Freeze or reject any pending claims associated with this attribution
  for (const item of attribution.claimItems) {
    if (item.rewardClaim.status === RewardClaimStatus.PENDING) {
      await prisma.rewardClaim.update({
        where: { id: item.rewardClaim.id },
        data: {
          status: RewardClaimStatus.REJECTED,
          rejectedReason: `Automated clawback: Referred student ${attribution.candidateEmail || studentUserId} cancelled/refunded.`,
        },
      });

      await logReferralAudit({
        claimId: item.rewardClaim.id,
        actorId,
        action: 'CLAIM_FROZEN_CLAWBACK',
        previousState: RewardClaimStatus.PENDING,
        newState: RewardClaimStatus.REJECTED,
        reason: `Referred student attribution ${attribution.id} was disqualified.`,
      });
    }
  }
}

