'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { batchQueue } from '@/jobs/queue';
import { prisma } from '@/lib/prisma';
import { requireRole, getCurrentUser } from '@/lib/dal';
import { Weekday, BatchType, BatchLevel } from '@/lib/enums';
import { startOfDay } from 'date-fns';
import type { Day } from 'date-fns';
import { generateInstancesInternal } from '@/lib/instance-generator';
import {
  assignCoachSchema,
  createBatchSchema,
  enrollStudentsSchema,
  unenrollStudentSchema,
  updateBatchSchema,
  updateClassTimingsSchema,
  type CreateBatchInput,
} from '@/lib/validation/batch';
import type { ActionResult } from '@/lib/types';
import { SYLLABUS_MAP, type BatchLevel as SyllabusLevelType } from '@/lib/syllabus';

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

  const baseDate = startOfDay(startDate ? new Date(startDate) : new Date());
  await generateInstancesInternal(createdBatch.id, finalInstancesCount, baseDate);

  revalidatePath('/admin/batches');
  return { success: true };
}

// reassign or update the batch teacher
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

export async function setBatchActiveState(batchId: string, isActive: boolean): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  await prisma.batch.update({ where: { id: batchId }, data: { isActive } });

  revalidatePath('/admin/batches');
  return { success: true };
}

export async function updateBatch(input: z.infer<typeof updateBatchSchema>): Promise<ActionResult> {
  // Let this action be called, but we will explicitly check roles for sensitive operations
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
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

  // Security check: Payouts can never be decreased. Only Admins can increase them.
  if (payoutRate !== undefined) {
    if (payoutRate < existingBatch.payoutRate) {
      return { success: false, error: 'Payout rate cannot be decreased.' };
    }
    if (payoutRate > existingBatch.payoutRate && user.role !== 'ADMIN') {
      return { success: false, error: 'Only an admin can increase the payout rate.' };
    }
  }

  const batchUpdateData: any = {};
  if (name !== undefined && name !== existingBatch.name) batchUpdateData.name = name;
  if (code !== undefined && code !== existingBatch.code) batchUpdateData.code = code;
  if (meetLink !== undefined && meetLink !== existingBatch.meetLink) batchUpdateData.meetLink = meetLink;
  if (type !== undefined && type !== existingBatch.type) batchUpdateData.type = type as any;
  if (parsedStartDate !== null && existingBatch.startDate?.getTime() !== parsedStartDate.getTime()) batchUpdateData.startDate = parsedStartDate;
  
  const targetCoachId = coachId || null;
  if (targetCoachId !== existingBatch.coachProfileId) batchUpdateData.coachProfileId = targetCoachId;
  
  if (payoutRate !== undefined && payoutRate !== existingBatch.payoutRate) batchUpdateData.payoutRate = payoutRate;
  
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

  // Trigger if user explicitly sent level or startSession — they want a resync
  const syllabusChanged = level !== undefined || startSession !== undefined;

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

export async function cancelClassInstance(instanceId: string): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  try {
    const instance = await prisma.classInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      return { success: false, error: 'Class instance not found.' };
    }

    if (instance.status === 'COMPLETED') {
      return { success: false, error: 'Cannot cancel a completed class session.' };
    }

    await prisma.classInstance.update({
      where: { id: instanceId },
      data: { status: 'CANCELLED' },
    });

    revalidatePath('/admin/batches');
    return { success: true };
  } catch (err: any) {
    console.error('Error cancelling class instance:', err);
    return { success: false, error: err.message || 'Failed to cancel class instance.' };
  }
}

export async function getBatchSessions(batchId: string) {
  await requireRole(['ADMIN']);

  try {
    const instances = await prisma.classInstance.findMany({
      where: { batchId },
      orderBy: { date: 'asc' },
    });

    return {
      success: true,
      data: instances.map(inst => ({
        id: inst.id,
        date: inst.date.toISOString(),
        startTime: inst.startTime,
        endTime: inst.endTime,
        status: inst.status,
      })),
    };
  } catch (err: any) {
    console.error('Error fetching batch sessions:', err);
    return { success: false, error: err.message || 'Failed to fetch sessions.' };
  }
}

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

export async function updateClassTimings(input: z.infer<typeof updateClassTimingsSchema>): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  const parsed = updateClassTimingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { batchId, instanceId, newStartTime, newEndTime, updateAllFuture } = parsed.data;

  try {
    if (updateAllFuture) {
      const today = startOfDay(new Date());
      await prisma.classInstance.updateMany({
        where: {
          batchId,
          status: 'SCHEDULED',
          date: { gte: today },
        },
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
        },
      });
    } else {
      if (!instanceId) {
        return { success: false, error: 'Instance ID is required when updating a specific session.' };
      }

      const instance = await prisma.classInstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance || instance.batchId !== batchId) {
        return { success: false, error: 'Class instance not found.' };
      }
      if (instance.status !== 'SCHEDULED') {
        return { success: false, error: 'Can only update scheduled sessions.' };
      }

      await prisma.classInstance.update({
        where: { id: instanceId },
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
        },
      });
    }

    revalidatePath('/admin/batches');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating class timings:', err);
    return { success: false, error: err.message || 'Failed to update timings.' };
  }
}

