'use server';

import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { prisma } from '@/lib/prisma';
import { getOrCreateReferralCode } from '@/services/referral/referral-code.service';
import { getUserMilestoneProgress } from '@/services/referral/milestone.service';
import { ReferralStatus, RewardClaimStatus } from '@/generated/prisma/client';

/**
 * Mask a person's name for privacy: "Aarav Sharma" -> "Aarav S*****"
 */
function maskName(name: string | null | undefined): string {
  if (!name) return 'Chessmate';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const first = parts[0];
    return first.length > 2 ? `${first.slice(0, 2)}***` : `${first}*`;
  }
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first} ${last[0]}*****`;
}

/**
 * Mask an email for privacy: "aditya@example.com" -> "a***@example.com"
 */
function maskEmail(email: string | null | undefined): string {
  if (!email) return '***@***.***';
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.***';
  const maskedLocal = local.length > 1 ? `${local[0]}***` : '*';
  return `${maskedLocal}@${domain}`;
}

export async function getReferralDashboard() {
  const user = await requireRole([Role.STUDENT]);

  // 1. Get or create permanent code
  const referralCode = await getOrCreateReferralCode(user.id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://smc.academy';
  const shareableUrl = `${baseUrl}/signup?ref=${referralCode}`;

  // 2. Fetch milestone status
  const milestoneStatus = await getUserMilestoneProgress(user.id);

  // 3. Referral counts
  const [totalInvited, registeredCount, pendingCount, joinedCount] = await Promise.all([
    prisma.referralAttribution.count({ where: { referrerId: user.id } }),
    prisma.referralAttribution.count({ where: { referrerId: user.id, status: ReferralStatus.REGISTERED } }),
    prisma.referralAttribution.count({ where: { referrerId: user.id, status: ReferralStatus.PENDING } }),
    prisma.referralAttribution.count({
      where: {
        referrerId: user.id,
        status: { in: [ReferralStatus.JOINED_SUCCESSFULLY, ReferralStatus.REWARD_APPROVED, ReferralStatus.REWARD_DELIVERED] },
      },
    }),
  ]);

  // 4. Claims & Rewards summary
  const userClaims = await prisma.rewardClaim.findMany({
    where: { userId: user.id },
    include: { milestone: true },
    orderBy: { createdAt: 'desc' },
  });

  const totalEarnedCash = userClaims.reduce((acc, c) => {
    if (c.status === RewardClaimStatus.PAID && c.approvedCashAmount) {
      return acc + c.approvedCashAmount;
    }
    return acc;
  }, 0);

  const physicalGiftsClaimed = userClaims.filter(
    c => (c.status === RewardClaimStatus.DISPATCHED || c.status === RewardClaimStatus.DELIVERED) && c.giftItem
  ).length;

  // 5. Masked referrals list
  const attributions = await prisma.referralAttribution.findMany({
    where: { referrerId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const maskedReferrals = attributions.map(a => ({
    id: a.id,
    candidateDisplayName: maskName(a.candidateName),
    candidateMaskedEmail: maskEmail(a.candidateEmail),
    status: a.status,
    registeredAt: a.registeredAt ? a.registeredAt.toISOString() : null,
    joinedAt: a.joinedAt ? a.joinedAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
  }));

  // 6. Claim items formatted
  const formattedClaims = userClaims.map(c => ({
    id: c.id,
    milestoneId: c.milestoneId,
    milestoneTitle: c.milestone.title,
    rewardType: c.milestone.rewardType,
    status: c.status,
    approvedCashAmount: c.approvedCashAmount,
    giftItem: c.giftItem || c.milestone.giftDescription,
    paymentReference: c.paymentReference,
    deliveryCourier: c.deliveryCourier,
    deliveryTrackingNumber: c.deliveryTrackingNumber,
    claimedAt: c.createdAt.toISOString(),
    paidAt: c.paidAt ? c.paidAt.toISOString() : null,
    dispatchedAt: c.dispatchedAt ? c.dispatchedAt.toISOString() : null,
    deliveredAt: c.deliveredAt ? c.deliveredAt.toISOString() : null,
    rejectedReason: c.rejectedReason,
  }));

  // 7. Config & terms
  const config = await prisma.referralConfig.findUnique({
    where: { id: 'default' },
  });

  return {
    referralCode,
    shareableUrl,
    stats: {
      totalInvited,
      registered: registeredCount,
      joinedSuccessfully: joinedCount,
      pendingVerification: pendingCount,
      totalEarnedCash,
      physicalGiftsClaimed,
    },
    milestoneStatus,
    referrals: maskedReferrals,
    rewardClaims: formattedClaims,
    programTermsMarkdown: config?.programTermsMarkdown || null,
  };
}

