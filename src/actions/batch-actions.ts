'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { batchQueue } from '@/workers/queue';
import { prisma } from '@/lib/prisma';
import { requireRole, getCurrentUser } from '@/lib/dal';
import { Weekday, BatchType, BatchLevel } from '@/lib/enums';
import { startOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { getISTDayBounds, TIME_ZONE } from '@/lib/timezone';
import type { Day } from 'date-fns';
import { generateInstancesInternal } from '@/lib/instance-generator';
import {
  assignCoachSchema,
  createBatchSchema,
  enrollStudentsSchema,
  unenrollStudentSchema,
  updateBatchSchema,
  type CreateBatchInput,
} from '@/lib/validation/batch';
import type { ActionResult } from '@/lib/types';
import { SYLLABUS_MAP, type BatchLevel as SyllabusLevelType } from '@/lib/syllabus';

/**
 * Helper function to auto-generate a unique batch code.
 * Example: If prefix is "IND-AC1", it finds the highest existing number like "IND-AC1-05" 
 * and returns the next one "IND-AC1-06".
 */
async function generateBatchCode(prefix: string): Promise<string> {
  const existing = await prisma.batch.findMany({
    where: { code: { startsWith: `${prefix}-` } },
    select: { code: true }
  });
  let max = 0;
  for (const b of existing) {
    const num = parseInt(b.code.split('-')[1]);
    if (!isNaN(num) && num > max) {
      max = num;
    }
  }
  const next = max + 1;
  return `${prefix}-${next.toString().padStart(2, '0')}`;
}

/**
 * Creates a brand new batch.
 * 
 * Major steps:
 * 1. Verifies the user is an ADMIN.
 * 2. Validates input data.
 * 3. Auto-generates a batch code if a syllabus level is selected.
 * 4. Ensures the batch code is unique to avoid conflicts.
 * 5. Creates the batch and its initial weekly schedules in the database.
 * 6. Generates the actual class instances for the next few weeks based on the syllabus.
 */
export async function createBatch(input: CreateBatchInput): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  const parsed = createBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, code, meetLink, payoutRate, coachId, schedules, startDate, type, instancesCount, startingLecture } = parsed.data;

  let finalCode = code || '';
  let finalInstancesCount = instancesCount ?? 10;
  let batchLevelVal: SyllabusLevelType | null = null;

  if (input.level) {
    batchLevelVal = input.level as SyllabusLevelType;
    const syllabusInfo = SYLLABUS_MAP[batchLevelVal];
    if (syllabusInfo) {
      finalInstancesCount = syllabusInfo.lectures - (startingLecture || 1) + 1;
      if (finalInstancesCount < 1) finalInstancesCount = 1; // Fallback
      finalCode = await generateBatchCode(syllabusInfo.codePrefix);
    }
  }

  const existingCode = await prisma.batch.findUnique({ where: { code: finalCode } });
  if (existingCode && !input.level) {
    return { success: false, error: 'A batch with this code already exists.' };
  } else if (existingCode) {
    // If auto-generated hit a collision (very rare due to logic, but possible race condition)
    return { success: false, error: 'Failed to auto-generate code, please try again.' };
  }

  if (coachId) {
    const coach = await prisma.coachProfile.findUnique({ where: { id: coachId } });
    if (!coach) {
      return { success: false, error: 'Selected coach is not valid.' };
    }
  }

  const createdBatch = await prisma.batch.create({
    data: {
      name,
      code: finalCode,
      meetLink,
      type: type as any,
      startDate: startDate ? new Date(startDate) : null,
      payoutRate,
      coach: coachId ? { connect: { id: coachId } } : undefined,
      // @ts-ignore
      level: batchLevelVal as any,
      startSession: startingLecture || 1,
      schedules: {
        create: schedules.map((slot) => ({
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      },
    },
  });

  const baseRawDate = startDate ? new Date(startDate) : new Date();
  const baseDate = fromZonedTime(startOfDay(toZonedTime(baseRawDate, TIME_ZONE)), TIME_ZONE);
  await generateInstancesInternal(createdBatch.id, finalInstancesCount, baseDate);

  revalidatePath('/admin/batches');
  return { success: true };
}

/**
 * Assigns or updates the primary coach for a specific batch.
 * Replaces the existing coach with the newly selected one.
 * Restricted to ADMIN role only.
 */
export async function assignCoach(input: { batchId: string; coachId?: string }): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  const parsed = assignCoachSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { batchId, coachId } = parsed.data;

  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    return { success: false, error: 'Batch not found.' };
  }

  if (coachId) {
    const coach = await prisma.coachProfile.findUnique({ where: { id: coachId } });
    if (!coach) {
      return { success: false, error: 'Selected coach is not valid.' };
    }
  }

  await prisma.batch.update({
    where: { id: batchId },
    data: { coachProfileId: coachId },
  });

  revalidatePath('/admin/batches');
  return { success: true };
}

/**
 * Enrolls multiple students into a batch at once.
 * 
 * Safety checks:
 * - Only verified students can be added.
 * - Uses `skipDuplicates: true` so if a student is already in the batch, it won't crash.
 */
export async function enrollStudents(input: {
  batchId: string;
  studentIds: string[];
}): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  const parsed = enrollStudentsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { batchId, studentIds } = parsed.data;

  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    return { success: false, error: 'Batch not found.' };
  }

  const students = await prisma.studentProfile.findMany({
    where: { id: { in: studentIds }, user: { emailVerified: true } },
    select: { id: true },
  });

  if (students.length === 0) {
    return { success: false, error: 'No valid students selected.' };
  }

  await prisma.batchStudent.createMany({
    data: students.map((student) => ({ batchId, studentProfileId: student.id })),
    skipDuplicates: true,
  });

  revalidatePath('/admin/batches');
  return { success: true };
}


/**
 * Removes a single student from a batch.
 * This does not delete the student, it only removes their connection to this specific batch.
 */
export async function unenrollStudent(input: {
  batchId: string;
  studentId: string;
}): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  const parsed = unenrollStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  await prisma.batchStudent.deleteMany({
    where: { batchId: parsed.data.batchId, studentProfileId: parsed.data.studentId },
  });

  revalidatePath('/admin/batches');
  return { success: true };
}

/**
 * Toggles a batch between active and inactive state.
 * Inactive batches might be hidden from certain dashboards.
 */
export async function setBatchActiveState(batchId: string, isActive: boolean): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  await prisma.batch.update({ where: { id: batchId }, data: { isActive } });

  revalidatePath('/admin/batches');
  return { success: true };
}

/**
 * Core function for updating an existing batch's details.
 * 
 * Major Operations:
 * 1. Calculates exactly what fields changed to optimize DB updates.
 * 2. Compares the old student list with the new student list to figure out who to add/remove.
 * 3. Wraps all database changes in a `$transaction` to ensure data consistency (if one fails, all fail).
 * 4. If the syllabus `level` or `startSession` changed, it schedules a background job to rebuild the future class calendar.
 */
export async function updateBatch(input: z.infer<typeof updateBatchSchema>): Promise<ActionResult> {
  // Let this action be called, but we will explicitly check roles for sensitive operations
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = updateBatchSchema.safeParse(input);
  if (!parsed.success) { 
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { batchId, name, code, meetLink, startDate, coachId, studentIds, payoutRate, type, addInstancesCount, level, startSession } = parsed.data;

  const existingBatch = await prisma.batch.findUnique({ 
    where: { id: batchId },
    include: { students: { select: { studentProfileId: true } } }
  });
  if (!existingBatch) {
    return { success: false, error: 'Batch not found.' };
  }

  const existingCode = await prisma.batch.findUnique({ where: { code } });
  if (existingCode && existingCode.id !== batchId) {
    return { success: false, error: 'A batch with this code already exists.' };
  }

  if (coachId) {
    const coach = await prisma.coachProfile.findUnique({ where: { id: coachId } });
    if (!coach) {
      return { success: false, error: 'Selected coach is not valid.' };
    }
  }

  let parsedStartDate: Date | null = null;
  if (startDate) {
    parsedStartDate = new Date(startDate);
  }



  const batchUpdateData: any = {};
  if (name !== undefined && name !== existingBatch.name) batchUpdateData.name = name;
  if (code !== undefined && code !== existingBatch.code) batchUpdateData.code = code;
  if (meetLink !== undefined && meetLink !== existingBatch.meetLink) batchUpdateData.meetLink = meetLink;
  if (type !== undefined && type !== existingBatch.type) batchUpdateData.type = type as any;
  if (parsedStartDate !== null && existingBatch.startDate?.getTime() !== parsedStartDate.getTime()) batchUpdateData.startDate = parsedStartDate;
  
const targetCoachId = coachId !== undefined ? coachId : existingBatch.coachProfileId;

const coachChanged = targetCoachId !== existingBatch.coachProfileId;

if (coachChanged) {
  batchUpdateData.coachProfileId = targetCoachId;
}

// Payout rules:
// 1. Increase → always allowed
// 2. Decrease → only when coach changes
if (payoutRate !== undefined && payoutRate !== existingBatch.payoutRate) {
  if (payoutRate < existingBatch.payoutRate && !coachChanged) {
    return {
      success: false,
      error: 'Payout rate cannot be decreased unless the coach is changed.',
    };
  }

  batchUpdateData.payoutRate = payoutRate;
}
  
  const newStartSession = startSession || 1;
  if (level !== undefined && level !== existingBatch.level) batchUpdateData.level = level as any;
  if (startSession !== undefined && newStartSession !== existingBatch.startSession) batchUpdateData.startSession = newStartSession;

  const existingStudentIds = new Set(existingBatch.students.map(s => s.studentProfileId));
  const newStudentIds = new Set(studentIds);
  
  const studentsToAdd: string[] = [];
  const studentsToRemove: string[] = [];
  
  for (const id of studentIds) {
    if (!existingStudentIds.has(id)) studentsToAdd.push(id);
  }
  for (const id of existingStudentIds) {
    if (!newStudentIds.has(id)) studentsToRemove.push(id);
  }

  // Trigger if user explicitly changed level or startSession — they want a resync
  const syllabusChanged = 
    (level !== undefined && level !== existingBatch.level) || 
    (startSession !== undefined && startSession !== existingBatch.startSession);

  await prisma.$transaction(async (tx) => {
    // 1. Update batch details if anything changed
    if (Object.keys(batchUpdateData).length > 0) {
      await tx.batch.update({
        where: { id: batchId },
        data: batchUpdateData,
      });
    }

    // 2. Sync students: Remove
    if (studentsToRemove.length > 0) {
      await tx.batchStudent.deleteMany({
        where: { batchId, studentProfileId: { in: studentsToRemove } },
      });
    }

    // 3. Sync students: Add
    if (studentsToAdd.length > 0) {
      const validStudents = await tx.studentProfile.findMany({
        where: { id: { in: studentsToAdd }, user: { emailVerified: true } },
        select: { id: true },
      });
      if (validStudents.length > 0) {
        await tx.batchStudent.createMany({
          data: validStudents.map((s) => ({ batchId, studentProfileId: s.id })),
          skipDuplicates: true,
        });
      }
    }

  }); // End of transaction

  // 4. Enqueue background job to resync class instances if syllabus config was sent
  const finalLevel = level !== undefined ? level : existingBatch.level;
  if (syllabusChanged && finalLevel !== null) {
    await batchQueue.add(
      'sync-future-instances',
      { batchId, startSession },
      {
        jobId: `sync-${batchId}-${Date.now()}`,
        removeOnComplete: 100,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );
  }

  if (addInstancesCount && addInstancesCount > 0) {
    await generateInstancesInternal(batchId, addInstancesCount);
  }

  revalidatePath('/admin/batches');
  return { success: true };
}

/**
 * Manually generates more class instances for a batch.
 * For example, if a batch runs out of scheduled classes, an admin can click 
 * "Generate 10 more classes" and this function will create them sequentially.
 */
export async function generateMoreClassInstances(batchId: string, count: number): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  if (count <= 0) {
    return { success: false, error: 'Count must be greater than 0.' };
  }
  if (count > 300) {
    return { success: false, error: 'Cannot generate more than 300 instances.' };
  }

  try {
    await generateInstancesInternal(batchId, count);
    revalidatePath('/admin/batches');
    return { success: true };
  } catch (err: any) {
    console.error('Error generating instances:', err);
    return { success: false, error: err.message || 'Failed to generate instances.' };
  }
}



/**
 * Permanently deletes a batch from the database.
 * Warning: Because of foreign keys in Prisma, this may also cascade and delete related instances/associations.
 */
export async function deleteBatch(batchId: string) {
  try {
    await requireRole(['ADMIN']);

    await prisma.batch.delete({
      where: { id: batchId },
    });

    revalidatePath('/admin/batches');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete batch:', error);
    return { success: false, error: error.message || 'Failed to delete batch.' };
  }
}



