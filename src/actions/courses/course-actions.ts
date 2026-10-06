"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { generateUploadUrl, BUCKET_NAME } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import {
  createCourseSchema,
  updateCourseSchema,
  type CreateCourseInput,
  type UpdateCourseInput,
} from "@/lib/validation/course";
import type { ActionResult } from "@/lib/types";

export async function createCourse(input: CreateCourseInput): Promise<ActionResult & { courseId?: string }> {
  const user = await requireRole(["ADMIN", "TEACHER"]);

  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const course = await prisma.course.create({
      data: {
        ...parsed.data,
        createdById: user.id,
      },
    });

    revalidatePath("/admin/courses");
    return { success: true, courseId: course.id };
  } catch (error) {
    console.error("Failed to create course:", error);
    return { success: false, error: "Failed to create course." };
  }
}

export async function updateCourse(input: UpdateCourseInput): Promise<ActionResult> {
  await requireRole(["ADMIN", "TEACHER"]);

  const parsed = updateCourseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { id, ...data } = parsed.data;

  try {
    await prisma.course.update({
      where: { id },
      data,
    });

    revalidatePath("/admin/courses");
    return { success: true };
  } catch (error) {
    console.error("Failed to update course:", error);
    return { success: false, error: "Failed to update course." };
  }
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN", "TEACHER"]);

  try {
    await prisma.course.delete({
      where: { id },
    });

    revalidatePath("/admin/courses");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete course:", error);
    return { success: false, error: "Failed to delete course." };
  }
}

export async function toggleCoursePublish(id: string, isPublished: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN", "TEACHER"]);

  try {
    await prisma.course.update({
      where: { id },
      data: { isPublished },
    });

    revalidatePath("/admin/courses");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle course publish status:", error);
    return { success: false, error: "Failed to update course status." };
  }
}

const ALLOWED_THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Returns a presigned PUT URL for uploading a course thumbnail directly to S3,
 * plus the public URL to store on the course record.
 */
export async function getThumbnailUploadUrl(
  contentType: string,
  fileName: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  await requireRole(["ADMIN", "TEACHER"]);

  if (!ALLOWED_THUMBNAIL_TYPES.includes(contentType)) {
    throw new Error("Only JPEG, PNG, WEBP or GIF images are allowed.");
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  const key = `thumbnails/${randomUUID()}-${safeName}`;
  const uploadUrl = await generateUploadUrl(key, contentType);

  const base =
    process.env.S3_PUBLIC_BASE_URL ||
    `${(process.env.S3_ENDPOINT_URL || "https://t3.storageapi.dev").replace(/\/$/, "")}/${BUCKET_NAME}`;
  const publicUrl = `${base.replace(/\/$/, "")}/${key}`;

  return { uploadUrl, publicUrl, key };
}
