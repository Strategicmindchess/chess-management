import { z } from "zod";
import { Weekday } from "@/lib/enums";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WEEKDAY_VALUES = Object.values(Weekday) as [Weekday, ...Weekday[]];

const scheduleSlotSchema = z
  .object({
    day: z.enum(WEEKDAY_VALUES, "Select a day."),
    startTime: z.string().regex(TIME_REGEX, "Use 24h format, e.g. 16:00."),
    endTime: z.string().regex(TIME_REGEX, "Use 24h format, e.g. 17:00."),
  })
  .refine((slot) => slot.endTime > slot.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

export const createBatchSchema = z.object({
  name: z.string().trim().min(2, "Batch name must be at least 2 characters."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Batch code must be at least 2 characters.")
    .regex(/^[A-Z0-9-]+$/, "Use only letters, numbers and dashes."),
  meetLink: z.string().trim().url("Enter a valid URL."),
  payoutRate: z.number().int().min(0, "Payout rate must be a positive number."),
  coachId: z.string().trim().optional().or(z.literal("")),
  schedules: z
    .array(scheduleSlotSchema)
    .min(1, "Add at least one weekly schedule slot."),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;

export const assignCoachSchema = z.object({
  batchId: z.string().min(1),
  coachId: z.string().trim().optional().or(z.literal("")),
});

export const enrollStudentsSchema = z.object({
  batchId: z.string().min(1),
  studentIds: z.array(z.string().min(1)).min(1, "Select at least one student."),
});

export const unenrollStudentSchema = z.object({
  batchId: z.string().min(1),
  studentId: z.string().min(1),
});
