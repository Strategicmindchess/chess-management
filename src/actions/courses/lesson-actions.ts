"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { 
  createMultipartUpload, 
  getMultipartPreSignedUrls, 
  completeMultipartUploadAction,
  abortMultipartUpload,
  generateDownloadUrl,
  s3Client, 
  BUCKET_NAME 
} from "@/lib/s3";
import { HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Prisma } from "@/generated/prisma/client";
import {
  initUploadSchema,
  completeUploadSchema,
  type InitUploadInput,
  type CompleteUploadInput,
} from "@/lib/validation/lesson";
import type { ActionResult } from "@/lib/types";
import crypto from "crypto";

export async function initLessonUpload(
  input: InitUploadInput
): Promise<ActionResult & { lessonId?: string; uploadId?: string; videoKey?: string; presignedUrls?: { partNumber: number; url: string }[] }> {
  await requireRole(["ADMIN", "TEACHER"]);

  const parsed = initUploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { courseId, title, description, lessonNumber, partNumber, isPreview, fileName, contentType, partsCount } = parsed.data;

  try {
    // 1. Verify Course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return { success: false, error: "Course not found." };
    }

    // 2. Create the lesson in UPLOADING state
    let lesson = await prisma.courseLesson.create({
      data: {
        courseId,
        title,
        description,
        lessonNumber,
        partNumber,
        isPreview,
        status: "UPLOADING",
      },
    });

    // 3. Generate a unique key for the S3 object
    const uuid = crypto.randomUUID();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const videoKey = `courses/${courseId}/lessons/${lesson.id}/video/${uuid}-${cleanFileName}`;

    try {
      // 4. Initialize Multipart Upload
      const uploadId = await createMultipartUpload(videoKey, contentType);
      
      if (!uploadId) {
        throw new Error("Failed to get UploadId from S3");
      }

      // 5. Generate presigned URLs for all parts
      const presignedUrls = await getMultipartPreSignedUrls(videoKey, uploadId, partsCount);

      // 6. Update the lesson with the generated videoKey
      lesson = await prisma.courseLesson.update({
        where: { id: lesson.id },
        data: { videoKey },
      });

      return {
        success: true,
        lessonId: lesson.id,
        uploadId,
        videoKey,
        presignedUrls,
      };
    } catch (s3Error) {
      // Clean up orphaned record if S3 operations fail
      await prisma.courseLesson.delete({ where: { id: lesson.id } }).catch(() => {});
      console.error("Failed to generate S3 multipart URLs:", s3Error);
      return { success: false, error: "Failed to initialize storage upload." };
    }
  } catch (error) {
    console.error("Failed to initialize lesson upload:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { success: false, error: "A lesson with this number and part already exists." };
      }
    }
    return { success: false, error: "Failed to initialize upload." };
  }
}

export async function completeLessonUpload(
  input: CompleteUploadInput
): Promise<ActionResult> {
  await requireRole(["ADMIN", "TEACHER"]);

  const parsed = completeUploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { lessonId, uploadId, parts } = parsed.data;

  try {
    // 1. Fetch the lesson and verify state
    const lesson = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      return { success: false, error: "Lesson not found." };
    }

    // Idempotent check
    if (lesson.status === "READY") {
      return { success: true };
    }

    if (lesson.status !== "UPLOADING" || !lesson.videoKey) {
      return { success: false, error: "Lesson is not in a valid state to be completed." };
    }

    // 2. Complete the multipart upload on S3
    try {
      await completeMultipartUploadAction(lesson.videoKey, uploadId, parts);
    } catch (s3Error) {
      console.error("S3 CompleteMultipartUpload Error:", s3Error);
      return { success: false, error: "Failed to complete multipart upload on storage." };
    }

    // 3. Verify file exists on S3 and validate ContentLength
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: lesson.videoKey,
      });
      const headRes = await s3Client.send(headCommand);
      
      if (!headRes.ContentLength || headRes.ContentLength === 0) {
        return { success: false, error: "Uploaded file is empty." };
      }
    } catch (s3Error: any) {
      console.error("S3 HeadObject Error:", s3Error);
      if (s3Error.name === "NotFound" || s3Error.$metadata?.httpStatusCode === 404) {
         return { success: false, error: "Uploaded video file not found in storage." };
      }
      return { success: false, error: "Failed to verify video upload." };
    }

    // 4. Mark lesson as ready
    const updatedLesson = await prisma.courseLesson.update({
      where: { id: lessonId },
      data: {
        status: "READY",
      },
    });

    revalidatePath(`/admin/courses/${updatedLesson.courseId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to complete lesson upload:", error);
    return { success: false, error: "Failed to mark lesson as ready." };
  }
}

/** Marks an in-progress upload as FAILED and aborts the S3 multipart upload. */
export async function failLessonUpload(lessonId: string, uploadId?: string): Promise<ActionResult> {
  await requireRole(["ADMIN", "TEACHER"]);
  try {
    const lesson = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
    if (!lesson) return { success: false, error: "Lesson not found." };
    if (uploadId && lesson.videoKey) {
      await abortMultipartUpload(lesson.videoKey, uploadId).catch(() => {});
    }
    await prisma.courseLesson.update({ where: { id: lessonId }, data: { status: "FAILED" } });
    revalidatePath(`/admin/courses/${lesson.courseId}`);
    revalidatePath(`/teacher/courses/${lesson.courseId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to mark lesson failed:", error);
    return { success: false, error: "Failed to update lesson." };
  }
}

export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  await requireRole(["ADMIN", "TEACHER"]);
  try {
    const lesson = await prisma.courseLesson.delete({ where: { id: lessonId } });
    if (lesson.videoKey) {
      await s3Client
        .send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: lesson.videoKey }))
        .catch((e) => console.error("Failed to delete S3 object:", e));
    }
    revalidatePath(`/admin/courses/${lesson.courseId}`);
    revalidatePath(`/teacher/courses/${lesson.courseId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete lesson:", error);
    return { success: false, error: "Failed to delete lesson." };
  }
}

export async function updateLessonTitle(lessonId: string, title: string): Promise<ActionResult> {
  await requireRole(["ADMIN", "TEACHER"]);
  if (!title.trim()) return { success: false, error: "Title is required." };
  try {
    const lesson = await prisma.courseLesson.update({ where: { id: lessonId }, data: { title: title.trim() } });
    revalidatePath(`/admin/courses/${lesson.courseId}`);
    revalidatePath(`/teacher/courses/${lesson.courseId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update lesson:", error);
    return { success: false, error: "Failed to update lesson." };
  }
}

/** Short-lived signed URL to play a lesson video. */
export async function getLessonVideoUrl(lessonId: string): Promise<ActionResult & { url?: string }> {
  const user = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);
  
  const lesson = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.status !== "READY" || !lesson.videoKey) {
    return { success: false, error: "Video not available." };
  }

  // Security check for STUDENT
  if (user.role === "STUDENT" && !lesson.isPreview) {
    const access = await prisma.courseAccess.findUnique({
      where: {
        courseId_studentId: {
          courseId: lesson.courseId,
          studentId: user.id
        }
      }
    });

    if (!access) {
      return { success: false, error: "You do not have access to this course." };
    }
  }

  return { success: true, url: await generateDownloadUrl(lesson.videoKey) };
}
