'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { prisma } from '@/lib/prisma';
import { ReferralStatus, RewardClaimStatus, RewardType } from '@/generated/prisma/client';
import { logReferralAudit } from '@/services/referral/referral-audit.service';
import { revalidatePath } from 'next/cache';

export async function getAdminReferralOverview(params?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const admin = await requireRole([Role.ADMIN]);

  const search = params?.search?.trim();
  const statusFilter = params?.status && params.status !== 'ALL' ? (params.status as ReferralStatus) : undefined;
  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.min(100, params?.pageSize || 25);
  const skip = (page - 1) * pageSize;

  const whereClause: any = {};
  if (statusFilter) {
    whereClause.status = statusFilter;
  }
  if (search) {
    whereClause.OR = [
      { candidateEmail: { contains: search, mode: 'insensitive' } },
      { candidateName: { contains: search, mode: 'insensitive' } },
      { referralCodeSnapshot: { contains: search, mode: 'insensitive' } },
      { referrer: { name: { contains: search, mode: 'insensitive' } } },
      { referrer: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [totalCount, attributions, pendingClaimsCount, totalQualifiedCount, totalCashPaidRes, totalGiftsDispatchedCount] =
    await Promise.all([
      prisma.referralAttribution.count({ where: whereClause }),
      prisma.referralAttribution.findMany({
        where: whereClause,
        include: {
          referrer: { select: { id: true, name: true, email: true, phone: true } },
          referredUser: {
            select: {
              id: true,
              name: true,
              email: true,
              studentProfile: {
                select: {
                  enrollments: { select: { batch: { select: { code: true, name: true } } } },
                  feeConfig: { select: { cycles: { where: { status: 'PAID' }, select: { id: true } } } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.rewardClaim.count({ where: { status: RewardClaimStatus.PENDING } }),
      prisma.referralAttribution.count({
        where: {
          status: { in: [ReferralStatus.JOINED_SUCCESSFULLY, ReferralStatus.REWARD_APPROVED, ReferralStatus.REWARD_DELIVERED] },
        },
      }),
      prisma.rewardClaim.aggregate({
        _sum: { approvedCashAmount: true },
        where: { status: RewardClaimStatus.PAID },
      }),
      prisma.rewardClaim.count({
        where: { status: { in: [RewardClaimStatus.DISPATCHED, RewardClaimStatus.DELIVERED] } },
      }),
    ]);

  // Fetch pending or recent claims for admin review
  const claims = await prisma.rewardClaim.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      milestone: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Fetch current milestones configuration
  const milestones = await prisma.rewardMilestone.findMany({
    orderBy: { milestoneOrder: 'asc' },
  });

  // Format attributions
  const items = attributions.map(a => {
    const student = a.referredUser;
    const paidCyclesCount = student?.studentProfile?.feeConfig?.cycles?.length || 0;
    const batches = student?.studentProfile?.enrollments?.map(e => e.batch.code).filter(Boolean) || [];

    return {
      id: a.id,
      code: a.referralCodeSnapshot,
      status: a.status,
      referrer: {
        id: a.referrer.id,
        name: a.referrer.name,
        email: a.referrer.email,
        phone: a.referrer.phone,
      },
      candidate: {
        name: a.candidateName || student?.name || 'Pending registration',
        email: a.candidateEmail || student?.email || 'N/A',
        phone: a.candidatePhone || 'N/A',
        paidFeeCycles: paidCyclesCount,
        batches: batches.join(', ') || 'No active batch',
      },
      registeredAt: a.registeredAt ? a.registeredAt.toISOString() : null,
      qualifiedAt: a.qualifiedAt ? a.qualifiedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      disqualificationReason: a.disqualificationReason,
    };
  });

  const formattedClaims = claims.map(c => ({
    id: c.id,
    user: c.user,
    milestoneId: c.milestoneId,
    milestoneTitle: c.milestone.title,
    rewardType: c.milestone.rewardType,
    maxCashAmount: c.milestone.maxCashAmount,
    giftDescription: c.milestone.giftDescription,
    status: c.status,
    payoutUpiId: c.payoutUpiId,
    payoutBankDetails: c.payoutBankDetails ? JSON.parse(c.payoutBankDetails as string) : null,
    shippingDetails: c.shippingAddressLine
      ? {
          fullName: c.shippingFullName,
          phone: c.shippingPhone,
          addressLine: c.shippingAddressLine,
          city: c.shippingCity,
          state: c.shippingState,
          pincode: c.shippingPincode,
        }
      : null,
    approvedCashAmount: c.approvedCashAmount,
    approvalNotes: c.approvalNotes,
    rejectedReason: c.rejectedReason,
    paymentReference: c.paymentReference,
    deliveryCourier: c.deliveryCourier,
    deliveryTrackingNumber: c.deliveryTrackingNumber,
    claimedAt: c.createdAt.toISOString(),
    paidAt: c.paidAt ? c.paidAt.toISOString() : null,
    dispatchedAt: c.dispatchedAt ? c.dispatchedAt.toISOString() : null,
  }));

  return {
    stats: {
      totalAttributions: totalCount,
      totalQualified: totalQualifiedCount,
      pendingClaims: pendingClaimsCount,
      totalCashDisbursed: totalCashPaidRes._sum.approvedCashAmount || 0,
      totalGiftsDispatched: totalGiftsDispatchedCount,
    },
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
    attributions: items,
    claims: formattedClaims,
    milestones,
  };
}

const reviewClaimSchema = z.object({
  claimId: z.string().min(1),
  action: z.enum(['APPROVE', 'REJECT']),
  approvedCashAmount: z.number().int().min(0).optional(),
  approvalNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export async function reviewRewardClaim(input: z.infer<typeof reviewClaimSchema>) {
  const admin = await requireRole([Role.ADMIN]);

  const parsed = reviewClaimSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { claimId, action, approvedCashAmount, approvalNotes, rejectionReason } = parsed.data;

  const claim = await prisma.rewardClaim.findUnique({
    where: { id: claimId },
    include: { milestone: true, user: true },
  });

  if (!claim) {
    return { success: false, error: 'Claim record not found.' };
  }

  if (action === 'APPROVE') {
    const finalCash =
      approvedCashAmount !== undefined ? approvedCashAmount : claim.milestone.maxCashAmount;

    await prisma.rewardClaim.update({
      where: { id: claimId },
      data: {
        status: RewardClaimStatus.APPROVED,
        approvedCashAmount: finalCash,
        approvedByAdminId: admin.id,
        approvalNotes: approvalNotes || 'Approved by Super Admin',
      },
    });

    await logReferralAudit({
      claimId,
      actorId: admin.id,
      action: 'CLAIM_APPROVED',
      previousState: claim.status,
      newState: RewardClaimStatus.APPROVED,
      reason: `Approved with cash cap ₹${finalCash}. Notes: ${approvalNotes || 'None'}`,
    });
  } else {
    if (!rejectionReason || rejectionReason.trim().length < 4) {
      return { success: false, error: 'Please enter a clear reason for rejecting this claim.' };
    }

    await prisma.rewardClaim.update({
      where: { id: claimId },
      data: {
        status: RewardClaimStatus.REJECTED,
        rejectedReason: rejectionReason.trim(),
        approvedByAdminId: admin.id,
      },
    });

    await logReferralAudit({
      claimId,
      actorId: admin.id,
      action: 'CLAIM_REJECTED',
      previousState: claim.status,
      newState: RewardClaimStatus.REJECTED,
      reason: rejectionReason.trim(),
    });
  }

  revalidatePath('/admin/referrals');
  revalidatePath('/student/earn');
  return { success: true };
}

const recordDisbursementSchema = z.object({
  claimId: z.string().min(1),
  fulfilmentType: z.enum(['CASH', 'PHYSICAL_GIFT']),
  paymentReference: z.string().optional(),
  deliveryCourier: z.string().optional(),
  deliveryTrackingNumber: z.string().optional(),
  isDelivered: z.boolean().default(false),
});

export async function recordRewardDisbursement(input: z.infer<typeof recordDisbursementSchema>) {
  const admin = await requireRole([Role.ADMIN]);

  const parsed = recordDisbursementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { claimId, fulfilmentType, paymentReference, deliveryCourier, deliveryTrackingNumber, isDelivered } = parsed.data;

  const claim = await prisma.rewardClaim.findUnique({
    where: { id: claimId },
  });

  if (!claim) {
    return { success: false, error: 'Claim not found.' };
  }

  if (fulfilmentType === 'CASH') {
    if (!paymentReference || paymentReference.trim().length < 4) {
      return { success: false, error: 'Please enter a valid Bank / UPI UTR or Payment Reference.' };
    }

    await prisma.rewardClaim.update({
      where: { id: claimId },
      data: {
        status: RewardClaimStatus.PAID,
        paymentReference: paymentReference.trim(),
        paidAt: new Date(),
      },
    });

    await logReferralAudit({
      claimId,
      actorId: admin.id,
      action: 'CASH_DISBURSED',
      previousState: claim.status,
      newState: RewardClaimStatus.PAID,
      reason: `Disbursed cash reward. UTR/Reference: ${paymentReference}`,
    });
  } else {
    // Physical gift
    if (!deliveryCourier || !deliveryTrackingNumber) {
      return { success: false, error: 'Please enter both the Courier Name and Tracking / AWB Number.' };
    }

    const nextStatus = isDelivered ? RewardClaimStatus.DELIVERED : RewardClaimStatus.DISPATCHED;
    await prisma.rewardClaim.update({
      where: { id: claimId },
      data: {
        status: nextStatus,
        deliveryCourier: deliveryCourier.trim(),
        deliveryTrackingNumber: deliveryTrackingNumber.trim(),
        dispatchedAt: claim.dispatchedAt || new Date(),
        deliveredAt: isDelivered ? new Date() : null,
      },
    });

    await logReferralAudit({
      claimId,
      actorId: admin.id,
      action: isDelivered ? 'GIFT_DELIVERED' : 'GIFT_DISPATCHED',
      previousState: claim.status,
      newState: nextStatus,
      reason: `Courier: ${deliveryCourier}, Tracking: ${deliveryTrackingNumber}`,
    });
  }

  revalidatePath('/admin/referrals');
  revalidatePath('/student/earn');
  return { success: true };
}

export async function updateMilestonesConfig(
  milestones: Array<{
    id: string;
    requiredReferrals: number;
    title: string;
    rewardType: RewardType;
    maxCashAmount: number;
    giftDescription?: string | null;
    isCumulative: boolean;
    isActive: boolean;
  }>
) {
  const admin = await requireRole([Role.ADMIN]);

  for (const m of milestones) {
    await prisma.rewardMilestone.update({
      where: { id: m.id },
      data: {
        requiredReferrals: m.requiredReferrals,
        title: m.title,
        rewardType: m.rewardType,
        maxCashAmount: m.maxCashAmount,
        giftDescription: m.giftDescription || null,
        isCumulative: m.isCumulative,
        isActive: m.isActive,
      },
    });
  }

  await logReferralAudit({
    actorId: admin.id,
    action: 'CONFIG_UPDATED',
    reason: 'Super Admin updated milestone thresholds and reward limits',
  });

  revalidatePath('/admin/referrals');
  revalidatePath('/student/earn');
  return { success: true };
}

export async function exportReferralsCsv() {
  await requireRole([Role.ADMIN]);

  const attributions = await prisma.referralAttribution.findMany({
    include: {
      referrer: { select: { name: true, email: true, phone: true } },
      referredUser: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'Attribution ID',
    'Referral Code',
    'Status',
    'Referrer Name',
    'Referrer Email',
    'Referrer Phone',
    'Candidate Name',
    'Candidate Email',
    'Candidate Phone',
    'Registered At',
    'Qualified At',
    'Created At',
  ];

  const rows = attributions.map(a => [
    `"${a.id}"`,
    `"${a.referralCodeSnapshot}"`,
    `"${a.status}"`,
    `"${(a.referrer?.name || '').replace(/"/g, '""')}"`,
    `"${a.referrer?.email || ''}"`,
    `"${a.referrer?.phone || ''}"`,
    `"${(a.candidateName || a.referredUser?.name || '').replace(/"/g, '""')}"`,
    `"${a.candidateEmail || a.referredUser?.email || ''}"`,
    `"${a.candidatePhone || ''}"`,
    `"${a.registeredAt ? a.registeredAt.toISOString() : ''}"`,
    `"${a.qualifiedAt ? a.qualifiedAt.toISOString() : ''}"`,
    `"${a.createdAt.toISOString()}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return {
    success: true,
    csv: csvContent,
    filename: `smc_referrals_export_${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

