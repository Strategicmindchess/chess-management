'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { prisma } from '@/lib/prisma';
import { ReferralStatus, RewardClaimStatus, RewardType } from '@/generated/prisma/client';
import { logReferralAudit } from '@/services/referral/referral-audit.service';
import { revalidatePath } from 'next/cache';

const claimSchema = z.object({
  milestoneId: z.string().min(1, 'Milestone is required'),
  payoutUpiId: z.string().trim().optional(),
  payoutBankDetails: z
    .object({
      accountNumber: z.string().min(8, 'Account number is too short').max(25),
      ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, 'Invalid IFSC code'),
      accountHolderName: z.string().min(2, 'Holder name is required'),
      bankName: z.string().min(2, 'Bank name is required'),
    })
    .optional(),
  shippingDetails: z
    .object({
      fullName: z.string().min(2, 'Full name is required'),
      phone: z.string().min(10, 'Valid 10-digit phone number is required'),
      addressLine: z.string().min(5, 'Address is too short'),
      city: z.string().min(2, 'City is required'),
      state: z.string().min(2, 'State is required'),
      pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit Indian PIN code'),
    })
    .optional(),
});

export type ClaimMilestoneInput = z.infer<typeof claimSchema>;

export async function claimMilestoneReward(input: ClaimMilestoneInput) {
  const user = await requireRole([Role.STUDENT]);

  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input data.' };
  }

  const { milestoneId, payoutUpiId, payoutBankDetails, shippingDetails } = parsed.data;

  // 1. Fetch milestone
  const milestone = await prisma.rewardMilestone.findUnique({
    where: { id: milestoneId },
  });

  if (!milestone || !milestone.isActive) {
    return { success: false, error: 'This reward milestone is not active or could not be found.' };
  }

  // 2. Check if already claimed
  const existingClaim = await prisma.rewardClaim.findFirst({
    where: {
      userId: user.id,
      milestoneId,
      status: { notIn: [RewardClaimStatus.REJECTED] },
    },
  });

  if (existingClaim) {
    return { success: false, error: 'You have already submitted a claim for this milestone.' };
  }

  // 3. Verify qualified referrals count
  const qualifiedAttributions = await prisma.referralAttribution.findMany({
    where: {
      referrerId: user.id,
      status: {
        in: [
          ReferralStatus.JOINED_SUCCESSFULLY,
          ReferralStatus.REWARD_APPROVED,
          ReferralStatus.REWARD_DELIVERED,
        ],
      },
    },
    take: milestone.requiredReferrals,
  });

  if (qualifiedAttributions.length < milestone.requiredReferrals) {
    return {
      success: false,
      error: `You need ${milestone.requiredReferrals} qualified chessmate(s) to claim this reward. You currently have ${qualifiedAttributions.length}.`,
    };
  }

  // 4. Validate payout / shipping requirements by reward type
  if (milestone.rewardType === RewardType.CASH || milestone.rewardType === RewardType.HYBRID) {
    if (!payoutUpiId && !payoutBankDetails) {
      return { success: false, error: 'Please provide either a valid UPI ID or Bank Account Details for your cash reward.' };
    }
  }

  if (milestone.rewardType === RewardType.PHYSICAL_GIFT || milestone.rewardType === RewardType.HYBRID) {
    if (!shippingDetails) {
      return { success: false, error: 'Please provide your shipping address to receive the physical smartwatch.' };
    }
  }

  // 5. Get user referral code record
  const referralCode = await prisma.referralCode.findUnique({
    where: { userId: user.id },
  });

  if (!referralCode) {
    return { success: false, error: 'Referral code not found for this account.' };
  }

  // 6. Create Reward Claim and link claim items
  const claim = await prisma.$transaction(async tx => {
    const newClaim = await tx.rewardClaim.create({
      data: {
        userId: user.id,
        milestoneId,
        referralCodeId: referralCode.id,
        status: RewardClaimStatus.PENDING,
        giftItem: milestone.giftDescription,
        payoutUpiId: payoutUpiId || null,
        payoutBankDetails: payoutBankDetails ? (payoutBankDetails as any) : undefined,
        shippingFullName: shippingDetails?.fullName || null,
        shippingPhone: shippingDetails?.phone || null,
        shippingAddressLine: shippingDetails?.addressLine || null,
        shippingCity: shippingDetails?.city || null,
        shippingState: shippingDetails?.state || null,
        shippingPincode: shippingDetails?.pincode || null,
      },
    });

    // Link the attributions that qualified this claim
    for (const attr of qualifiedAttributions) {
      await tx.rewardClaimItem.create({
        data: {
          rewardClaimId: newClaim.id,
          attributionId: attr.id,
        },
      });
    }

    return newClaim;
  });

  await logReferralAudit({
    claimId: claim.id,
    actorId: user.id,
    action: 'CLAIM_SUBMITTED',
    newState: RewardClaimStatus.PENDING,
    reason: `Student submitted claim for ${milestone.title}`,
  });

  revalidatePath('/student/earn');
  return { success: true, claimId: claim.id };
}

