'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole, getCurrentUser } from '@/lib/dal';
import { Weekday, BatchType } from '@/lib/enums';
import { addWeeks, nextDay, startOfDay } from 'date-fns';
import type { Day } from 'date-fns';
import {
  assignCoachSchema,
  createBatchSchema,
  enrollStudentsSchema,
  unenrollStudentSchema,
  updateBatchSchema,
  type CreateBatchInput,
} from '@/lib/validation/batch';
import type { ActionResult } from '@/lib/types';

export async function createBatch(input: CreateBatchInput): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  const parsed = createBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, code, meetLink, payoutRate, coachId, schedules, startDate, type, instancesCount } = parsed.data;

  const existingCode = await prisma.batch.findUnique({ where: { code } });
  if (existingCode) {
    return { success: false, error: 'A batch with this code already exists.' };
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
      code,
      meetLink,
      type: type as any,
      startDate: startDate ? new Date(startDate) : null,
      payoutRate,
      coachProfileId: coachId,
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
  await generateInstancesInternal(createdBatch.id, instancesCount ?? 10, baseDate);

  revalidatePath('/admin/batches');
  return { success: true };
}

async function generateInstancesInternal(batchId: string, count: number, customStartDate?: Date) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { schedules: true },
  });

  if (!batch || batch.schedules.length === 0) {
    return;
  }

  // Determine starting date
  let startDate: Date;
  if (customStartDate) {
    startDate = startOfDay(customStartDate);
  } else {
    const lastInstance = await prisma.classInstance.findFirst({
      where: { batchId },
      orderBy: { date: 'desc' },
    });
    if (lastInstance) {
      startDate = startOfDay(new Date(lastInstance.date));
      startDate.setDate(startDate.getDate() + 1); // Next day after latest
    } else {
      startDate = startOfDay(batch.startDate ? new Date(batch.startDate) : new Date());
    }
  }

  const existing = await prisma.classInstance.findMany({
    where: { batchId },
    select: { date: true, startTime: true },
  });

  const existingKeys = new Set(
    existing.map(
      (inst) =>
        `${startOfDay(new Date(inst.date)).toISOString().split('T')[0]}|${inst.startTime}`
    )
  );

  const WEEKDAY_MAP: Record<Weekday, Day> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };

  const newInstances: any[] = [];
  let currentDate = new Date(startDate);
  let daysInspected = 0;

  while (newInstances.length < count && daysInspected < 730) {
    const dayOfWeek = currentDate.getDay();
    const matchingSchedules = batch.schedules.filter(
      (s) => WEEKDAY_MAP[s.day as Weekday] === dayOfWeek
    );

    matchingSchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (const schedule of matchingSchedules) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const key = `${dateStr}|${schedule.startTime}`;

      if (!existingKeys.has(key)) {
        if (newInstances.length < count) {
          newInstances.push({
            batchId,
            date: new Date(currentDate),
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: 'SCHEDULED',
          });
          existingKeys.add(key);
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
    daysInspected++;
  }

  if (newInstances.length > 0) {
    await prisma.classInstance.createMany({
      data: newInstances,
    });
  }
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
    where: { id: { in: studentIds } },
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

  const { batchId, name, code, meetLink, startDate, coachId, studentIds, payoutRate, type, addInstancesCount } = parsed.data;

  const existingBatch = await prisma.batch.findUnique({ where: { id: batchId } });
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

  await prisma.$transaction(async (tx) => {
    // 1. Update batch details
    await tx.batch.update({
      where: { id: batchId },
      data: {
        name,
        code,
        meetLink,
        type: type as any,
        startDate: parsedStartDate,
        coachProfileId: coachId || null,
        ...(payoutRate !== undefined ? { payoutRate } : {}),
      },
    });

    // 2. Sync students: Delete all existing enrollments
    await tx.batchStudent.deleteMany({
      where: { batchId },
    });

    // 3. Sync students: Re-create enrollments for selected students
    if (studentIds.length > 0) {
      const validStudents = await tx.studentProfile.findMany({
        where: { id: { in: studentIds } },
        select: { id: true },
      });

      if (validStudents.length > 0) {
        await tx.batchStudent.createMany({
          data: validStudents.map((s) => ({ batchId, studentProfileId: s.id })),
          skipDuplicates: true,
        });
      }
    }
  });

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
