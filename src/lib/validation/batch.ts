import { z } from "zod";
import { Weekday, BatchType, BatchLevel } from "@/lib/enums";

const BATCH_TYPE_VALUES = Object.values(BatchType) as [BatchType, ...BatchType[]];
const BATCH_LEVEL_VALUES = Object.values(BatchLevel) as [BatchLevel, ...BatchLevel[]];

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
    .regex(/^[A-Z0-9-]*$/, "Use only letters, numbers and dashes.")
    .optional()
    .or(z.literal("")),
  meetLink: z.string().trim().url("Enter a valid URL."),
  type: z.enum(BATCH_TYPE_VALUES),
  instancesCount: z.number().int().min(1, "Must schedule at least 1 class.").max(300, "Cannot schedule more than 300 classes."),
  startDate: z.string().optional(),
  payoutRate: z.number().int().min(0, "Payout rate must be a positive number."),
  coachId: z.string().trim().optional().or(z.literal("")),
  schedules: z
    .array(scheduleSlotSchema)
    .min(1, "Add at least one weekly schedule slot."),
  level: z.string().optional(),
  startingLecture: z.number().int().min(1).optional(),
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

export const updateBatchSchema = z.object({
  batchId: z.string().min(1),
  name: z.string().trim().min(2, "Batch name must be at least 2 characters."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Batch code must be at least 2 characters.")
    .regex(/^[A-Z0-9-]+$/, "Use only letters, numbers and dashes."),
  meetLink: z.string().trim().url("Enter a valid URL."),
  type: z.enum(BATCH_TYPE_VALUES).optional(),
  addInstancesCount: z.coerce.number().int().min(0, "Must be 0 or more.").max(300, "Cannot add more than 300 instances at once.").optional().default(0),
  startDate: z.string().optional().or(z.literal("")),
  coachId: z.string().trim().optional().or(z.literal("")),
  payoutRate: z.coerce.number().min(0, "Payout rate must be at least 0.").optional(),
  level: z.enum(BATCH_LEVEL_VALUES).optional(),
  startSession: z.coerce.number().int().min(1, "Must be at least 1").optional().default(1),
  studentIds: z.array(z.string()),
});

export const updateClassTimingsSchema = z.object({
  batchId: z.string().min(1),
  instanceId: z.string().optional(),
  newStartTime: z.string().regex(TIME_REGEX, "Use 24h format, e.g. 16:00."),
  newEndTime: z.string().regex(TIME_REGEX, "Use 24h format, e.g. 17:00."),
  newDate: z.string().optional(),
  updateAllFuture: z.boolean().default(false),
}).refine(data => data.newEndTime > data.newStartTime, {
  message: "End time must be after start time.",
  path: ["newEndTime"],
});

