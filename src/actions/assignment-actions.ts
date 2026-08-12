"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { Role } from "@/lib/enums";

export async function getStudentAssignments() {
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

    const assignments = await prisma.studentAssignment.findMany({
      where: {
        studentProfileId: profile.id,
        batchAssignment: {
          releasedAt: {
            lte: new Date(),
          },
        },
      },
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
    });

    const now = new Date();

    const formattedAssignments = assignments.map((sa) => {
      const dueDate = sa.batchAssignment.dueDate;
      const isOverdue = dueDate ? dueDate < now : false;
      const remainingMs = dueDate ? dueDate.getTime() - now.getTime() : 0;
      const remainingHours = remainingMs > 0 ? Math.floor(remainingMs / (1000 * 60 * 60)) : 0;

      return {
        id: sa.id,
        title: sa.batchAssignment.resource.title,
        description: sa.batchAssignment.resource.description,
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

    let totalScore = 0;
    formattedAssignments.forEach(sa => {
      if (sa.completionLevel === "FULLY_DONE") totalScore += 1;
      else if (sa.completionLevel === "HALF_DONE") totalScore += 0.5;
    });

    const progress = {
      total: formattedAssignments.length,
      score: totalScore,
      percentage: formattedAssignments.length > 0 ? (totalScore / formattedAssignments.length) * 100 : 0
    };

    return { success: true, data: formattedAssignments, progress };
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

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating assignment status:", error);
    return { success: false, error: error.message || "Failed to update assignment status" };
  }
}

import { Prisma } from "@prisma/client";

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
