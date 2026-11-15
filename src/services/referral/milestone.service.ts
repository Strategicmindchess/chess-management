import { prisma } from '@/lib/prisma';
import { ReferralStatus, RewardClaimStatus, type RewardMilestone } from '@/generated/prisma/client';

export interface MilestoneProgressItem {
  id: string;
  milestoneOrder: number;
  requiredReferrals: number;
  title: string;
  rewardType: 'CASH' | 'PHYSICAL_GIFT' | 'HYBRID';
  maxCashAmount: number;
  giftDescription?: string | null;
  isUnlocked: boolean;
  isClaimed: boolean;
  claimStatus?: RewardClaimStatus | null;
  claimId?: string | null;
}

export interface UserMilestoneStatus {
  totalQualifiedCount: number;
  milestones: MilestoneProgressItem[];
  activeMilestone: MilestoneProgressItem;
  overallProgressPercentage: number;
}

/**
 * Computes the cumulative milestone progression for a referrer user.
 */
export async function getUserMilestoneProgress(userId: string): Promise<UserMilestoneStatus> {
  // Count qualified referrals (status in JOINED_SUCCESSFULLY, REWARD_APPROVED, REWARD_DELIVERED)
  const qualifiedCount = await prisma.referralAttribution.count({
    where: {
      referrerId: userId,
      status: {
        in: [
          ReferralStatus.JOINED_SUCCESSFULLY,
          ReferralStatus.REWARD_APPROVED,
          ReferralStatus.REWARD_DELIVERED,
        ],
      },
    },
  });

  // Fetch all active milestones ordered
  const milestones: RewardMilestone[] = await prisma.rewardMilestone.findMany({
    where: { isActive: true },
    orderBy: { milestoneOrder: 'asc' },
  });

  // Fetch all claims submitted by this user
  const userClaims = await prisma.rewardClaim.findMany({
    where: { userId },
    select: {
      id: true,
      milestoneId: true,
      status: true,
    },
  });

  const claimMap = new Map(userClaims.map(c => [c.milestoneId, c]));

  const progressItems: MilestoneProgressItem[] = milestones.map(m => {
    const isUnlocked = qualifiedCount >= m.requiredReferrals;
    const claim = claimMap.get(m.id);
    const isClaimed = !!claim && claim.status !== RewardClaimStatus.REJECTED;

    return {
      id: m.id,
      milestoneOrder: m.milestoneOrder,
      requiredReferrals: m.requiredReferrals,
      title: m.title,
      rewardType: m.rewardType,
      maxCashAmount: m.maxCashAmount,
      giftDescription: m.giftDescription,
      isUnlocked,
      isClaimed,
      claimStatus: claim?.status ?? null,
      claimId: claim?.id ?? null,
    };
  });

  // Find the next milestone that hasn't been claimed or the highest one
  const nextTarget = progressItems.find(m => !m.isClaimed) || progressItems[progressItems.length - 1] || {
    id: 'default',
    milestoneOrder: 1,
    requiredReferrals: 1,
    title: '1 Chessmate',
    rewardType: 'CASH' as const,
    maxCashAmount: 500,
    giftDescription: null,
    isUnlocked: false,
    isClaimed: false,
  };

  const progressPercentage = Math.min(
    100,
    Math.round((qualifiedCount / (nextTarget.requiredReferrals || 1)) * 100)
  );

  return {
    totalQualifiedCount: qualifiedCount,
    milestones: progressItems,
    activeMilestone: nextTarget,
    overallProgressPercentage: progressPercentage,
  };
}

