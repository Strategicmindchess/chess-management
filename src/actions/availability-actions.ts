"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import type { ActionResult } from "@/lib/types";

export interface DateAvailabilitySlot {
  date: string; // ISO string
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export async function addAvailabilitySlots(slots: DateAvailabilitySlot[]): Promise<ActionResult> {
  const user = await requireRole([Role.TEACHER]);

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id }
  });

  if (!coachProfile) {
    return { success: false, error: "Coach profile not found." };
  }

  try {
    // Upsert or create many. createMany with skipDuplicates is available in Postgres
    await prisma.coachAvailability.createMany({
      data: slots.map(slot => ({
        coachId: coachProfile.id,
        date: new Date(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
      skipDuplicates: true, // Prevents crashing on the @@unique constraint
    });

    revalidatePath("/teacher/availability");
    return { success: true };
  } catch (err: any) {
    console.error("Error adding availability:", err);
    return { success: false, error: err.message || "Failed to save availability." };
  }
}

export async function deleteAvailabilitySlot(id: string): Promise<ActionResult> {
  const user = await requireRole([Role.TEACHER]);
  
  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id }
  });
  
  if (!coachProfile) return { success: false, error: "Profile not found" };

  try {
    await prisma.coachAvailability.delete({
      where: { id, coachId: coachProfile.id }
    });
    
    revalidatePath("/teacher/availability");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting slot:", err);
    return { success: false, error: "Failed to delete slot." };
  }
}
