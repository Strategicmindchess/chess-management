"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { Role, AttendanceStatus } from "@/lib/enums";

const submitClassLogSchema = z.object({
  batchId: z.string().min(1),
  date: z.string().datetime(),
  topicCovered: z.string().min(3),
  durationMins: z.number().int().min(1),
  attendance: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.nativeEnum(AttendanceStatus),
    })
  ),
});

type SubmitClassLogInput = z.infer<typeof submitClassLogSchema>;

export async function submitClassLog(input: SubmitClassLogInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.TEACHER) {
    return { success: false, error: "Unauthorized" };
  }

  const result = submitClassLogSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: "Invalid input data" };
  }
  const data = result.data;

  try {
    const batch = await prisma.batch.findUnique({
      where: { id: data.batchId },
      select: { coachProfileId: true, payoutRate: true },
    });

    if (!batch) {
      return { success: false, error: "Batch not found" };
    }

    if (!user.coachProfile || batch.coachProfileId !== user.coachProfile.id) {
      return { success: false, error: "You are not assigned to this batch" };
    }

    await prisma.$transaction(async (tx) => {
      const classLog = await tx.classLog.create({
        data: {
          batchId: data.batchId,
          coachProfileId: user.coachProfile!.id,
          date: new Date(data.date),
          topicCovered: data.topicCovered,
          durationMins: data.durationMins,
          payoutAmount: batch.payoutRate, // Snapshot of current rate
        },
      });

      if (data.attendance.length > 0) {
        await tx.attendanceRecord.createMany({
          data: data.attendance.map((att) => ({
            classLogId: classLog.id,
            studentProfileId: att.studentId,
            status: att.status,
          })),
        });
      }
    });

    revalidatePath("/teacher");
    return { success: true };
  } catch (err: any) {
    console.error("Error submitting class log:", err);
    return { success: false, error: err.message || "Failed to submit class log" };
  }
}

export async function getBatchClassLogs(batchId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const logs = await prisma.classLog.findMany({
      where: { batchId },
      include: {
        coach: { include: { user: { select: { name: true } } } },
        attendance: {
          include: {
            student: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return { success: true, data: logs };
  } catch (err: any) {
    console.error("Error fetching class logs:", err);
    return { success: false, error: err.message || "Failed to fetch class logs" };
  }
}
