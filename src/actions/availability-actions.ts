"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role, Weekday } from "@/lib/enums";
import type { ActionResult } from "@/lib/types";

export interface AvailabilitySlot {
  day: Weekday;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export async function updateAvailability(slots: AvailabilitySlot[]): Promise<ActionResult> {
  const user = await requireRole([Role.TEACHER]);

  // Use a transaction to delete old availability and insert new ones
  await prisma.$transaction([
    prisma.coachAvailability.deleteMany({
      where: { coachId: user.id },
    }),
    prisma.coachAvailability.createMany({
      data: slots.map(slot => ({
        coachId: user.id,
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    }),
  ]);

  revalidatePath("/teacher");
  return { success: true };
}
