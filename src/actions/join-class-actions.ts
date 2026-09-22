"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";

/**
 * Called when a teacher clicks the "Join" button for a scheduled class.
 * Records the exact time they joined so penalty calculations are accurate.
 */
export async function recordClassJoinTime(classInstanceId: string) {
  try {
    const user = await requireRole([Role.TEACHER]);

    const instance = await prisma.classInstance.findUnique({
      where: { id: classInstanceId },
      include: { batch: true },
    });

    if (!instance) {
      throw new Error("Class instance not found");
    }

    if (!instance.batch.coachProfileId) {
      throw new Error("No coach assigned to this batch");
    }

    const now = new Date();

    // Use a transaction to ensure both records are updated
    await prisma.$transaction(async (tx) => {
      // 1. Always create a join event row for the history
      await tx.classJoinEvent.create({
        data: {
          classInstanceId,
          coachProfileId: instance.batch.coachProfileId!,
          joinedAt: now,
          source: "JOIN_BUTTON",
        },
      });

      // 2. Only set startedAt the very first time they are joining
      // This serves as the 'firstJoinAt' for penalty calculations
      if (!instance.startedAt) {
        await tx.classInstance.update({
          where: { id: classInstanceId },
          data: { startedAt: now },
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[recordClassJoinTime] Error:", error);
    return { success: false, error: "Failed to record join time" };
  }
}
