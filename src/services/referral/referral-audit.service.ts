import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';

export interface AuditLogInput {
  attributionId?: string;
  claimId?: string;
  actorId?: string; // Admin User ID or 'SYSTEM'
  action: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function logReferralAudit(input: AuditLogInput): Promise<void> {
  try {
    await prisma.referralAuditLog.create({
      data: {
        attributionId: input.attributionId,
        claimId: input.claimId,
        actorId: input.actorId || 'SYSTEM',
        action: input.action,
        previousState: input.previousState,
        newState: input.newState,
        reason: input.reason,
        metadata: input.metadata,
      },
    });
  } catch (err) {
    console.error('Failed to write referral audit log:', err);
  }
}

