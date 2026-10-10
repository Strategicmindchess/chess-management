"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import type { ActionResult } from "@/lib/types";
import { Role } from "@/lib/enums";

/**
 * Fetches active batches for dropdown selection.
 */
export async function getBatchOptions() {
  await requireRole([Role.ADMIN]);
  return await prisma.batch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Fetches students with optional search query and cursor pagination.
 */
export async function fetchStudentsForAccess(query: string, cursor?: string) {
  await requireRole([Role.ADMIN]);
  
  const whereClause = query.length >= 2 ? {
    role: Role.STUDENT,
    OR: [
      { name: { contains: query, mode: "insensitive" } as const },
      { email: { contains: query, mode: "insensitive" } as const },
      { phone: { contains: query, mode: "insensitive" } as const }
    ]
  } : {
    role: Role.STUDENT,
  };

  const students = await prisma.user.findMany({
    where: whereClause,
    take: 20,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    }
  });

  return {
    students,
    nextCursor: students.length === 20 ? students[19].id : null,
  };
}

/**
 * Grants access to a specific student for a course.
 */
export async function grantCourseAccess(courseId: string, studentId: string): Promise<ActionResult> {
  const admin = await requireRole([Role.ADMIN]);

  try {
    // Upsert to handle if they already have access
    await prisma.courseAccess.upsert({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        }
      },
      update: {},
      create: {
        courseId,
        studentId,
        grantedBy: admin.id,
      }
    });

    revalidatePath(`/admin/courses`);
    revalidatePath(`/student/courses`);
    return { success: true };
  } catch (error) {
    console.error("Failed to grant course access:", error);
    return { success: false, error: "Failed to grant course access." };
  }
}

/**
 * Revokes access to a specific student for a course.
 */
export async function revokeCourseAccess(courseId: string, studentId: string): Promise<ActionResult> {
  await requireRole([Role.ADMIN]);

  try {
    await prisma.courseAccess.delete({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        }
      }
    });

    revalidatePath(`/admin/courses`);
    revalidatePath(`/student/courses`);
    return { success: true };
  } catch (error) {
    console.error("Failed to revoke course access:", error);
    return { success: false, error: "Failed to revoke course access." };
  }
}

/**
 * Grants access to an entire batch for a paid course.
 * Uses Bulk Insert (createMany) to avoid N+1 query problem.
 */
export async function grantCourseAccessToBatch(courseId: string, batchId: string): Promise<ActionResult> {
  const admin = await requireRole([Role.ADMIN]);

  try {
    // 1. Fetch all students in the batch
    const batchStudents = await prisma.batchStudent.findMany({
      where: { batchId },
      select: { student: { select: { userId: true } } }
    });

    if (batchStudents.length === 0) {
      return { success: false, error: "This batch has no students." };
    }

    // 2. Bulk Insert all access records in a single query
    await prisma.courseAccess.createMany({
      data: batchStudents.map(bs => ({
        courseId,
        studentId: bs.student.userId,
        grantedBy: admin.id,
      })),
      skipDuplicates: true, // Avoids crashing if some students already have access
    });

    revalidatePath(`/admin/courses`);
    revalidatePath(`/student/courses`);
    return { success: true };
  } catch (error) {
    console.error("Failed to grant course access to batch:", error);
    return { success: false, error: "Failed to grant course access to the batch." };
  }
}
