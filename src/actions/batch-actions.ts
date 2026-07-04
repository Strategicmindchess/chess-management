'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/dal';
import {
  assignCoachSchema,
  createBatchSchema,
  enrollStudentsSchema,
  unenrollStudentSchema,
  type CreateBatchInput,
} from '@/lib/validation/batch';
import type { ActionResult } from '@/lib/types';

export async function createBatch(input: CreateBatchInput): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  const parsed = createBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, code, meetLink, coachId, schedules } = parsed.data;

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
