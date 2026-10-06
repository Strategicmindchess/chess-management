import { z } from 'zod';

export const initUploadSchema = z.object({
  courseId: z.string().cuid(),
  title: z.string().min(1, "Lesson title is required"),
  description: z.string().optional(),
  lessonNumber: z.number().int().min(1),
  partNumber: z.number().int().min(1).default(1),
  isPreview: z.boolean().default(false),
  fileName: z.string().min(1, "File name is required"),
  contentType: z.string().min(1, "Content type is required"),
  partsCount: z.number().int().min(1, "At least 1 part is required").max(10000, "Max 10000 parts allowed"),
});

export type InitUploadInput = z.infer<typeof initUploadSchema>;

export const completeUploadSchema = z.object({
  lessonId: z.string().cuid(),
  uploadId: z.string().min(1, "Upload ID is required"),
  parts: z.array(z.object({
    ETag: z.string(),
    PartNumber: z.number().int().min(1),
  })).min(1, "At least one part must be provided"),
});

export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
