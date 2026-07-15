'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/dal';
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

  const { name, code, meetLink, payoutRate, coachId, schedules } = parsed.data;

  const existingCode = await prisma.batch.findUnique({ where: { code } });
  if (existingCode) {
    return { success: false, error: 'A batch with this code already exists.' };
  }

  if (coachId) {
    const coach = await prisma.user.findUnique({ where: { id: coachId } });
    if (!coach || coach.role !== 'TEACHER') {
      return { success: false, error: 'Selected coach is not valid.' };
    }
  }

  await prisma.batch.create({
    data: {
      name,
      code,
      meetLink,
      payoutRate,
      coachId: coachId || null,
      schedules: {
        create: schedules.map((slot) => ({
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      },
    },
  });

  revalidatePath('/admin/batches');
  return { success: true };
}

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
    const coach = await prisma.user.findUnique({ where: { id: coachId } });
    if (!coach || coach.role !== 'TEACHER') {
      return { success: false, error: 'Selected coach is not valid.' };
    }
  }

  await prisma.batch.update({
    where: { id: batchId },
    data: { coachId: coachId || null },
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

  const students = await prisma.user.findMany({
    where: { id: { in: studentIds }, role: 'STUDENT' },
    select: { id: true },
  });

  if (students.length === 0) {
    return { success: false, error: 'No valid students selected.' };
  }

  await prisma.batchStudent.createMany({
    data: students.map((student) => ({ batchId, studentId: student.id })),
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
    where: { batchId: parsed.data.batchId, studentId: parsed.data.studentId },
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
  await requireRole(['ADMIN']);

  const parsed = updateBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { batchId, name, code, meetLink, startDate, coachId, studentIds } = parsed.data;

  const existingCode = await prisma.batch.findUnique({ where: { code } });
  if (existingCode && existingCode.id !== batchId) {
    return { success: false, error: 'A batch with this code already exists.' };
  }

  if (coachId) {
    const coach = await prisma.user.findUnique({ where: { id: coachId } });
    if (!coach || coach.role !== 'TEACHER') {
      return { success: false, error: 'Selected coach is not valid.' };
    }
  }
  
  // Set the start date based on the input
  let parsedStartDate: Date | null = null;
  if (startDate) {
    parsedStartDate = new Date(startDate);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update batch details
    await tx.batch.update({
      where: { id: batchId },
      data: {
        name,
        code,
        meetLink,
        startDate: parsedStartDate,
        coachId: coachId || null,
      },
    });

    // 2. Sync students: Delete all existing enrollments
    await tx.batchStudent.deleteMany({
      where: { batchId },
    });

    // 3. Sync students: Re-create enrollments for selected students
    if (studentIds.length > 0) {
      const validStudents = await tx.user.findMany({
        where: { id: { in: studentIds }, role: 'STUDENT' },
        select: { id: true },
      });
      
      if (validStudents.length > 0) {
        await tx.batchStudent.createMany({
          data: validStudents.map((s) => ({ batchId, studentId: s.id })),
          skipDuplicates: true,
        });
      }
    }
  });

  revalidatePath('/admin/batches');
  return { success: true };
}
