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

/**
 * SUBMIT CLASS LOG ACTION
 *
 * -------------------------------------------------------------------------------------------------
 * HISTORICAL INCIDENT / ROOT CAUSE REPORT (Pehle kya dikkat thi?):
 * -------------------------------------------------------------------------------------------------
 * 1. Transaction Timeout (5000ms default limit exceeded):
 *    - In the original implementation, Prisma's interactive transaction had no explicit timeout,
 *      falling back to the default 5000ms limit.
 *    - Over 15 sequential database roundtrips were running INSIDE `prisma.$transaction(async (tx) => ...)`.
 *    - Over remote database connections (Railway PostgreSQL), network latency is ~200-300ms per roundtrip.
 *    - By the time execution reached `tx.batchAssignment.create()`, 5638ms had elapsed, throwing:
 *      "Invalid prisma.batchAssignment.create() invocation: Transaction API error: query cannot be executed
 *      on an expired transaction. The timeout for this transaction was 5000 ms, however 5638 ms passed."
 *
 * 2. N+1 Query Loop inside Transaction:
 *    - For each syllabus resource, a separate `findUnique` query ran sequentially inside `tx`,
 *      followed by sequential `batchAssignment.create` and `studentAssignment.createMany`.
 *
 * 3. Unindexed Read Operations:
 *    - `Resource (level, lectureNumber)`, `ClassJoinEvent (classInstanceId, coachProfileId, joinedAt)`,
 *      and `ClassLog (batchId, date)` had no compound indexes, triggering slow sequential table scans.
 *
 * -------------------------------------------------------------------------------------------------
 * HOW IT WAS FIXED & OPTIMIZED (Ab kaise theek kiya gaya?):
 * -------------------------------------------------------------------------------------------------
 * 1. Pre-fetching & Validation Outside Transaction:
 *    - `coachProfile` and `classInstance` are fetched in parallel via `Promise.all`.
 *    - `classJoinEvent.findFirst` validation is checked BEFORE starting the transaction, failing fast
 *      without opening or holding a database transaction connection.
 *    - Static curriculum lookups (`resource.findMany`) and enrolled students (`batchStudent.findMany`)
 *      are pre-fetched outside `tx` concurrently.
 *
 * 2. N+1 Query Loop Eliminated:
 *    - All existing assignments are checked in a single batch query:
 *      `batchAssignment.findMany({ where: { batchId, resourceId: { in: [...] } } })`.
 *    - Unreleased resources are filtered in memory (`resourcesToAssign`).
 *
 * 3. Atomic Transaction Scope Minimized:
 *    - Inside `tx`, only fast atomic write operations are performed:
 *      (classLog.create, classInstance.update, attendanceRecord.createMany, batchAssignment.create).
 *    - Multiple resource assignment insertions run concurrently via `Promise.all`.
 *
 * 4. Micro-Optimizations on Batch Auto-Archive:
 *    - If single-class batch (`batch._count.classInstances === 1`), archives with 0 extra queries.
 *    - Replaced `count()` with `findFirst({ select: { id: true } })` (LIMIT 1) for fast early-exit.
 *
 * 5. Extended Transaction Safety Timeout:
 *    - Configured `{ maxWait: 10000, timeout: 25000 }` (5x safety cushion, 25 seconds).
 *
 * 6. Composite Database Indexes Added:
 *    - Added `@@index([level, lectureNumber])` on `Resource`.
 *    - Added `@@index([classInstanceId, coachProfileId, joinedAt])` on `ClassJoinEvent`.
 *    - Added `@@index([batchId, status])` on `ClassInstance`.
 *    - Added `@@index([batchId, date])` and `@@index([coachProfileId, date])` on `ClassLog`.
 * -------------------------------------------------------------------------------------------------
 */
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
    // 1. Parallel fetch coachProfile and classInstance (reduces TTFB)
    const [coachProfile, classInstance] = await Promise.all([
      prisma.coachProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      }),
      prisma.classInstance.findUnique({
        where: { id: data.classInstanceId },
        include: {
          batch: { 
            select: { 
              id: true, 
              level: true,
              coachProfileId: true, 
              payoutRate: true, 
              type: true,
              _count: { select: { classInstances: true } },
            },
          },
        },
      }),
    ]);

    if (!classInstance) {
      return { success: false, error: "Class instance not found" };
    }

    if (classInstance.status === "COMPLETED") {
      return { success: false, error: "Attendance already marked for this class" };
    }

    const batch = classInstance.batch;

    if (!coachProfile || batch.coachProfileId !== coachProfile.id) {
      return { success: false, error: "You are not assigned to this batch" };
    }

    // 2. Pre-check join event outside the transaction to avoid holding/wasting a transaction
    //    Uses composite index: [classInstanceId, coachProfileId, joinedAt]
    const firstJoinEvent = await prisma.classJoinEvent.findFirst({
      where: {
        classInstanceId: classInstance.id,
        coachProfileId: coachProfile.id,
      },
      orderBy: { joinedAt: "asc" },
      select: { joinedAt: true },
    });

    if (!firstJoinEvent) {
      return {
        success: false,
        error: "Coach must join the class before marking attendance",
      };
    }

    // 3. Pre-fetch syllabus resources and enrolled students outside the transaction
    let resourcesToAssign: { id: string }[] = [];
    let enrolledStudentIds: string[] = [];

    if (batch.level && classInstance.sessionNumber) {
      // Parallel fetch resources & students
      const [resources, enrolledStudents] = await Promise.all([
        prisma.resource.findMany({
          where: {
            level: batch.level as any,
            lectureNumber: classInstance.sessionNumber,
          },
          select: { id: true },
        }),
        prisma.batchStudent.findMany({
          where: { batchId: batch.id },
          select: { studentProfileId: true },
        }),
      ]);

      if (resources.length > 0) {
        // Fetch all existing assignments in a single batch query (O(1) roundtrip vs O(N) loop)
        const existingBatchAssignments = await prisma.batchAssignment.findMany({
          where: {
            batchId: batch.id,
            resourceId: { in: resources.map((r) => r.id) },
          },
          select: { resourceId: true },
        });

        const existingResourceIds = new Set(
          existingBatchAssignments.map((a) => a.resourceId)
        );
        resourcesToAssign = resources.filter(
          (r) => !existingResourceIds.has(r.id)
        );
        enrolledStudentIds = enrolledStudents.map((s) => s.studentProfileId);
      }
    }

    // 4. Execute atomic updates with increased timeout & minimal work inside tx
    await prisma.$transaction(
      async (tx) => {
        // Create the class log     
        const classLog = await tx.classLog.create({
          data: {
            batchId: batch.id,
            coachProfileId: coachProfile.id,
            date: classInstance.date,
            topicCovered: data.topicCovered,
            durationMins: data.durationMins,
            payoutAmount: batch.payoutRate, // Snapshot of current rate
            attendanceMarkedAt: new Date(), // Explicitly saved for 24h delay calculation
            coachJoinedAt: firstJoinEvent.joinedAt, 
          },
        });

        const completedAt = new Date();
        // Update the class instance status and link to log
        await tx.classInstance.update({
          where: { id: classInstance.id },
          data: {
            status: "COMPLETED",
            classLogId: classLog.id,
            completedAt: completedAt, // Anchor for 24-hour assignment release timer
          },
        });

        // Bulk insert attendance records
        if (data.attendance.length > 0) {
          await tx.attendanceRecord.createMany({
            data: data.attendance.map((att) => ({
              classLogId: classLog.id,
              studentProfileId: att.studentId,
              status: att.status,
            })),
          });
        }

        // Create newly required batch assignments and student assignments concurrently
        if (resourcesToAssign.length > 0) {
          await Promise.all(
            resourcesToAssign.map(async (resource) => {
              const batchAssignment = await tx.batchAssignment.create({
                data: {
                  batchId: batch.id,
                  resourceId: resource.id,
                  lectureNumber: classInstance.sessionNumber,
                  releasedAt: completedAt,
                },
              });

              if (enrolledStudentIds.length > 0) {
                await tx.studentAssignment.createMany({
                  data: enrolledStudentIds.map((studentProfileId) => ({
                    batchAssignmentId: batchAssignment.id,
                    studentProfileId,
                  })),
                  skipDuplicates: true,
                });
              }
            })
          );
        }

        // Check if batch should be auto-archived
        const oneOffTypes = [
          "PTM",
          "DEMO",
          "SUBSTITUTE_SESSION",
          "DEMO_SESSION",
          "TRIAL",
          "REPLACEMENT",
          "MASTERCLASS",
        ];
        const isOneOffType = oneOffTypes.includes(batch.type);
        const isSingleClass = batch._count.classInstances === 1;

        if (isSingleClass) {
          // If this batch had only 1 scheduled class and we just completed it, archive immediately without an extra query
          await tx.batch.update({
            where: { id: batch.id },
            data: { isActive: false },
          });
        } else if (isOneOffType) {
          // For one-off batches, check if any uncompleted instances remain
          // findFirst with select id is much faster than count() because it stops at first match (LIMIT 1)
          const hasRemaining = await tx.classInstance.findFirst({
            where: {
              batchId: batch.id,
              status: { not: "COMPLETED" },
            },
            select: { id: true },
          });

          if (!hasRemaining) {
            await tx.batch.update({
              where: { id: batch.id },
              data: { isActive: false },
            });
          }
        }
      },
      {
        maxWait: 10000, // 10s wait to acquire connection
        timeout: 25000, // 25s timeout (increased from default 5s)
      }
    );

    revalidatePath("/teacher");
    revalidatePath("/teacher/attendance");
    revalidatePath("/student");
    revalidatePath("/student/my-classes");
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
