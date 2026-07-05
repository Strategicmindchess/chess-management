"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role, Weekday } from "@/lib/enums";
import type { ActionResult } from "@/lib/types";

export interface AvailabilitySlot {
  dayOfWeek: Weekday;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export async function updateAvailability(slots: AvailabilitySlot[]): Promise<ActionResult> {
  const user = await requireRole([Role.TEACHER]);

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id }
  });

  if (!coachProfile) {
    return { success: false, error: "Coach profile not found." };
  }

  // Deduplicate slots to prevent the same day and time from appearing multiple times
  const uniqueSlots = slots.filter((slot, index, self) =>
    index === self.findIndex((t) => (
      t.dayOfWeek === slot.dayOfWeek && 
      t.startTime === slot.startTime && 
      t.endTime === slot.endTime
    ))
  );

  // Use a transaction to delete old availability and insert new ones
  await prisma.$transaction([
    prisma.coachAvailability.deleteMany({
      where: { coachId: coachProfile.id },
    }),
    prisma.coachAvailability.createMany({
      data: uniqueSlots.map(slot => ({
        coachId: coachProfile.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    }),
  ]);

  revalidatePath("/teacher");
  return { success: true };
}
