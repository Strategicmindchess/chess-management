"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import type { ActionResult } from "@/lib/types";
import { Role } from "@/lib/enums";

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
