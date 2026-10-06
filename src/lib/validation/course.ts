import { z } from "zod";
import { BatchLevel } from "@/lib/enums";

export const createCourseSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  description: z.string().trim().min(1, "Description is required"),
  thumbnailUrl: z
    .union([z.string().url("Invalid thumbnail URL"), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  level: z.nativeEnum(BatchLevel).optional().nullable(),
  price: z.number().int().min(0, "Price cannot be negative"), // Price in paise
  isPublished: z.boolean().default(false),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = createCourseSchema.partial().extend({
  id: z.string().min(1, "Invalid course ID"),
});

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
