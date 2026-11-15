"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { revalidatePath } from "next/cache";
import { getCurrentPeriod } from "@/lib/leaderboard-period";

export interface GetStudentAssignmentsOptions {
  status?: "PENDING" | "HALF_DONE" | "FULLY_DONE" | "ALL";
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
}

/**
 * Ultra-fast progress calculation for dashboard / scorecards.
 * Uses Prisma groupBy on indexed completionLevel. Takes ~2ms and transfers 0 row data.
 */
export async function getStudentAssignmentProgress(studentProfileId: string) {
  try {
    const counts = await prisma.studentAssignment.groupBy({
      by: ["completionLevel"],
      where: {
        studentProfileId,
        batchAssignment: {
          releasedAt: {
            lte: new Date(),
          },
        },
      },
      _count: {
        _all: true,
      },
    });

    let total = 0;
    let score = 0;
    let pendingCount = 0;
    let halfDoneCount = 0;
    let completedCount = 0;

    for (const c of counts) {
      const cnt = c._count._all;
      total += cnt;
      if (c.completionLevel === "FULLY_DONE") {
        completedCount += cnt;
        score += cnt;
      } else if (c.completionLevel === "HALF_DONE") {
        halfDoneCount += cnt;
        score += cnt * 0.5;
      } else {
        pendingCount += cnt;
      }
    }

    return {
      total,
      score,
      percentage: total > 0 ? (score / total) * 100 : 0,
      pendingCount,
      halfDoneCount,
      completedCount,
    };
  } catch (error) {
    console.error("Error in getStudentAssignmentProgress:", error);
    return {
      total: 0,
      score: 0,
      percentage: 0,
      pendingCount: 0,
      halfDoneCount: 0,
      completedCount: 0,
    };
  }
}

export async function getStudentAssignments(options?: GetStudentAssignmentsOptions) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return { success: false, error: "Student profile not found" };
    }

    const now = new Date();

    // 1. Fast counts via groupBy (Takes ~2ms, no joins)
    const counts = await prisma.studentAssignment.groupBy({
      by: ["completionLevel"],
      where: {
        studentProfileId: profile.id,
        batchAssignment: {
          releasedAt: {
            lte: now,
          },
        },
      },
      _count: {
        _all: true,
      },
    });

    let total = 0;
    let score = 0;
    let pendingCount = 0;
    let halfDoneCount = 0;
    let completedCount = 0;

    for (const c of counts) {
      const cnt = c._count._all;
      total += cnt;
      if (c.completionLevel === "FULLY_DONE") {
        completedCount += cnt;
        score += cnt;
      } else if (c.completionLevel === "HALF_DONE") {
        halfDoneCount += cnt;
        score += cnt * 0.5;
      } else {
        pendingCount += cnt;
      }
    }

    const progress = {
      total,
      score,
      percentage: total > 0 ? (score / total) * 100 : 0,
      pendingCount,
      halfDoneCount,
      completedCount,
    };

    // 2. Build where filter for requested slice
    const status = options?.status ?? "PENDING";
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(options?.limit ?? 10, 50));
    const skip = (page - 1) * limit;

    const where: any = {
      studentProfileId: profile.id,
      batchAssignment: {
        releasedAt: {
          lte: now,
        },
      },
    };

    if (status === "PENDING") {
      where.completionLevel = "NOT_DONE";
    } else if (status === "HALF_DONE") {
      where.completionLevel = "HALF_DONE";
    } else if (status === "FULLY_DONE") {
      where.completionLevel = "FULLY_DONE";
    }
    // "ALL" does not filter by completionLevel

    if (options?.type && options.type !== "ALL") {
      where.batchAssignment = {
        ...where.batchAssignment,
        resource: {
          ...(where.batchAssignment?.resource || {}),
          type: options.type,
        },
      };
    }

    if (options?.search && options.search.trim()) {
      const term = options.search.trim();
      where.OR = [
        { batchAssignment: { resource: { title: { contains: term, mode: "insensitive" } } } },
        { batchAssignment: { batch: { name: { contains: term, mode: "insensitive" } } } },
      ];
    }

    // 3. Fetch only the requested 10 items + count
    const [totalFiltered, assignments] = await Promise.all([
      prisma.studentAssignment.count({ where }),
      prisma.studentAssignment.findMany({
        where,
        take: limit,
        skip,
        include: {
          batchAssignment: {
            include: {
              resource: true,
              batch: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          batchAssignment: {
            lectureNumber: "asc",
          },
        },
      }),
    ]);

    const formattedAssignments = assignments.map((sa) => {
      const dueDate = sa.batchAssignment.dueDate;
      const isOverdue = dueDate ? dueDate < now : false;
      const remainingMs = dueDate ? dueDate.getTime() - now.getTime() : 0;
      const remainingHours = remainingMs > 0 ? Math.floor(remainingMs / (1000 * 60 * 60)) : 0;

      return {
        id: sa.id,
        title: sa.batchAssignment.resource.title,
        description: sa.batchAssignment.resource.description || sa.batchAssignment.resource.source,
        url: sa.batchAssignment.resource.url,
        type: sa.batchAssignment.resource.type,
        lectureNumber: sa.batchAssignment.lectureNumber,
        batchName: sa.batchAssignment.batch?.name || "Unknown Batch",
        status: sa.status,
        completionLevel: sa.completionLevel,
        completedAt: sa.completedAt,
        releasedAt: sa.batchAssignment.releasedAt,
        dueDate,
        isOverdue,
        remainingHours,
      };
    });

    const totalPages = Math.ceil(totalFiltered / limit) || 1;

    return {
      success: true,
      data: formattedAssignments,
      progress,
      pagination: {
        page,
        limit,
        totalItems: totalFiltered,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (error: any) {
    console.error("Error fetching assignments:", error);
    return { success: false, error: error.message || "Failed to fetch assignments" };
  }
}

export async function updateAssignmentStatus(
  assignmentId: string,
  completionLevel: "NOT_DONE" | "HALF_DONE" | "FULLY_DONE"
) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return { success: false, error: "Student profile not found" };
    }

    const assignment = await prisma.studentAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.studentProfileId !== profile.id) {
      return { success: false, error: "Assignment not found" };
    }

    const status = completionLevel === "FULLY_DONE" ? "COMPLETED" : "PENDING";
    const completedAt = completionLevel === "FULLY_DONE" ? new Date() : null;

    const updated = await prisma.studentAssignment.update({
      where: { id: assignmentId },
      data: {
        completionLevel,
        status,
        completedAt,
      },
    });

    // Revalidate paths so cached UI updates immediately
    revalidatePath("/student");
    revalidatePath("/student/my-classes");
    revalidatePath("/student/assignments");

    // Recalculate assignment summary and leaderboard asynchronously in background
    try {
      const { assignmentSummaryQueue, leaderboardCalcQueue } = await import("@/workers/leaderboard.queues");
      const { periodStart, periodEnd } = getCurrentPeriod("MONTHLY");
      await assignmentSummaryQueue.add("calc-assignment", {
        periodType: "MONTHLY",
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      });
      await leaderboardCalcQueue.add("calc-leaderboard", {
        periodType: "MONTHLY",
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        studentProfileId: profile.id,
      }, { delay: 2000 });
    } catch (qErr) {
      console.warn("Could not queue leaderboard refresh after assignment update:", qErr);
    }

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating assignment status:", error);
    return { success: false, error: error.message || "Failed to update assignment status" };
  }
}


export async function getAssignmentReport() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.TEACHER && user.role !== Role.ADMIN)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    let whereClause: any = {};
    if (user.role === Role.TEACHER) {
      const coach = await prisma.coachProfile.findUnique({
        where: { userId: user.id },
      });
      if (!coach) return { success: false, error: "Coach not found" };
      whereClause = {
        batchAssignment: {
          batch: { coachProfileId: coach.id }
        }
      };
    }

    const assignments = await prisma.studentAssignment.findMany({
      where: whereClause as any,
      include: {
        student: {
          include: { user: true, enrollments: { include: { batch: true } } }
        },
        batchAssignment: {
          include: { resource: true, batch: true }
        }
      }
    });

    const studentMap = new Map();

    assignments.forEach(sa => {
      const sId = sa.studentProfileId;
      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          studentId: sId,
          name: (sa as any).student.user.name,
          email: (sa as any).student.user.email,
          batches: (sa as any).student.enrollments.map((b: any) => b.batch.name).join(", "),
          totalAssigned: 0,
          totalScore: 0,
          missingAssignments: [] as any[]
        });
      }
      
      const sData = studentMap.get(sId);
      sData.totalAssigned += 1;
      
      if (sa.completionLevel === "FULLY_DONE") {
        sData.totalScore += 1;
      } else if (sa.completionLevel === "HALF_DONE") {
        sData.totalScore += 0.5;
        sData.missingAssignments.push({
          title: (sa as any).batchAssignment.resource.title,
          status: "HALF_DONE",
          batchName: (sa as any).batchAssignment.batch.name
        });
      } else {
        sData.missingAssignments.push({
          title: (sa as any).batchAssignment.resource.title,
          status: "NOT_DONE",
          batchName: (sa as any).batchAssignment.batch.name
        });
      }
    });

    const detailedReport = Array.from(studentMap.values()).map(s => ({
      ...s,
      percentage: s.totalAssigned > 0 ? (s.totalScore / s.totalAssigned) * 100 : 0
    }));

    const totalStudentsWithAssignments = detailedReport.length;
    let studentsCompletedAll = 0;
    let studentsWithMissing = 0;

    detailedReport.forEach(s => {
      if (s.missingAssignments.length === 0 && s.totalAssigned > 0) {
        studentsCompletedAll += 1;
      } else if (s.missingAssignments.length > 0) {
        studentsWithMissing += 1;
      }
    });

    return { 
      success: true, 
      summary: {
        totalStudents: totalStudentsWithAssignments,
        completedAll: studentsCompletedAll,
        missing: studentsWithMissing
      },
      detailed: detailedReport
    };
  } catch (error: any) {
    console.error("Error fetching assignment report:", error);
    return { success: false, error: error.message || "Failed to fetch report" };
  }
}
