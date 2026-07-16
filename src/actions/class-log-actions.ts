"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { Role, AttendanceStatus } from "@/lib/enums";

const submitClassLogSchema = z.object({
  classInstanceId: z.string().min(1),
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
    const classInstance = await prisma.classInstance.findUnique({
      where: { id: data.classInstanceId },
      include: {
        batch: { select: { id: true, coachProfileId: true, payoutRate: true } }
      }
    });

    if (!classInstance) {
      return { success: false, error: "Class instance not found" };
    }

    if (classInstance.status === "COMPLETED") {
      return { success: false, error: "Attendance already marked for this class" };
    }

    const batch = classInstance.batch;

    if (!user.coachProfile || batch.coachProfileId !== user.coachProfile.id) {
      return { success: false, error: "You are not assigned to this batch" };
    }

    await prisma.$transaction(async (tx) => {
      // Create the class log
      const classLog = await tx.classLog.create({
        data: {
          batchId: batch.id,
          coachProfileId: user.coachProfile!.id,
          date: classInstance.date,
          topicCovered: data.topicCovered,
          durationMins: data.durationMins,
          payoutAmount: batch.payoutRate, // Snapshot of current rate
        },
      });

      // Update the class instance status and link to log
      await tx.classInstance.update({
        where: { id: classInstance.id },
        data: {
          status: "COMPLETED",
          classLogId: classLog.id
        }
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
