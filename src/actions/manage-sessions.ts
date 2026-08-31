'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/dal';
import { startOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { getISTDayBounds, TIME_ZONE } from '@/lib/timezone';
import {
  createClassInstanceSchema,
  updateClassInstanceSchema,
  rescheduleClassInstanceSchema,
  bulkUpdateClassTimingsSchema,
} from '@/lib/validation/batch';
import type { ActionResult } from '@/lib/types';

/**
 * Fetches all class sessions (past and future) for a given batch.
 * Ordered chronologically by date, then startTime.
 */
export async function getBatchSessions(batchId: string) {
  await requireRole(['ADMIN']);

  try {
    const instances = await prisma.classInstance.findMany({
      where: { batchId },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ],
    });

    return {
      success: true,
      data: instances.map(inst => ({
        id: inst.id,
        date: inst.date.toISOString(),
        startTime: inst.startTime,
        endTime: inst.endTime,
        status: inst.status,
        lectureName: inst.lectureName,
        sessionNumber: inst.sessionNumber,
      })),
    };
  } catch (err: any) {
    console.error('Error fetching batch sessions:', err);
    return { success: false, error: err.message || 'Failed to fetch sessions.' };
  }
}

/**
 * Manually create a new class instance.
 */
export async function createClassInstance(input: z.infer<typeof createClassInstanceSchema>): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  const parsed = createClassInstanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { batchId, date, startTime, endTime, lectureName, sessionNumber } = parsed.data;

  try {
    const normalizedDate = fromZonedTime(startOfDay(toZonedTime(new Date(date), TIME_ZONE)), TIME_ZONE);

    // Clash prevention: Ensure no SCHEDULED or COMPLETED class exists on this exact date and startTime for this batch.
    const existingClash = await prisma.classInstance.findFirst({
      where: {
        batchId,
        date: normalizedDate,
        startTime,
        status: { in: ['SCHEDULED', 'COMPLETED'] }
      }
    });

    if (existingClash) {
      return { success: false, error: 'A class is already scheduled or completed at this exact date and time.' };
    }

    await prisma.classInstance.create({
      data: {
        batchId,
        date: normalizedDate,
        startTime,
        endTime,
        status: 'SCHEDULED',
        lectureName: lectureName || null,
        sessionNumber: sessionNumber || null,
      },
    });

    revalidatePath('/admin/batches');
    return { success: true };
  } catch (err: any) {
    console.error('Error creating class instance:', err);
    return { success: false, error: err.message || 'Failed to create class instance.' };
  }
}

/**
 * Update an existing class instance (date, times, lectureName, sessionNumber).
 */
export async function updateClassInstance(input: z.infer<typeof updateClassInstanceSchema>): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  const parsed = updateClassInstanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { instanceId, newDate, newStartTime, newEndTime, lectureName, sessionNumber } = parsed.data;

  try {
    const instance = await prisma.classInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      return { success: false, error: 'Class instance not found.' };
    }
    if (instance.status !== 'SCHEDULED') {
      return { success: false, error: 'Can only update scheduled sessions.' };
    }

    const normalizedDate = fromZonedTime(startOfDay(toZonedTime(new Date(newDate), TIME_ZONE)), TIME_ZONE);

    // Clash prevention: if date or startTime changed, check for clashes.
    if (instance.date.getTime() !== normalizedDate.getTime() || instance.startTime !== newStartTime) {
      const existingClash = await prisma.classInstance.findFirst({
        where: {
          batchId: instance.batchId,
          date: normalizedDate,
          startTime: newStartTime,
          id: { not: instanceId },
          status: { in: ['SCHEDULED', 'COMPLETED'] }
        }
      });

      if (existingClash) {
        return { success: false, error: 'A class is already scheduled or completed at this new date and time.' };
      }
    }

    await prisma.classInstance.update({
      where: { id: instanceId },
      data: {
        date: normalizedDate,
        startTime: newStartTime,
        endTime: newEndTime,
        lectureName: lectureName || null,
        sessionNumber: sessionNumber || null,
      },
    });

    revalidatePath('/admin/batches');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating class instance:', err);
    return { success: false, error: err.message || 'Failed to update class instance.' };
  }
}

/**
 * Reschedule a cancelled class instance back to SCHEDULED with new timings.
 */
export async function rescheduleClassInstance(input: z.infer<typeof rescheduleClassInstanceSchema>): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  const parsed = rescheduleClassInstanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { instanceId, newDate, newStartTime, newEndTime } = parsed.data;

  try {
    const instance = await prisma.classInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      return { success: false, error: 'Class instance not found.' };
    }
    if (instance.status !== 'CANCELLED') {
      return { success: false, error: 'Can only reschedule cancelled sessions.' };
    }

    const normalizedDate = fromZonedTime(startOfDay(toZonedTime(new Date(newDate), TIME_ZONE)), TIME_ZONE);

    // Clash prevention
    const existingClash = await prisma.classInstance.findFirst({
      where: {
        batchId: instance.batchId,
        date: normalizedDate,
        startTime: newStartTime,
        status: { in: ['SCHEDULED', 'COMPLETED'] }
      }
    });

    if (existingClash) {
      return { success: false, error: 'A class is already scheduled or completed at this date and time.' };
    }

    await prisma.classInstance.update({
      where: { id: instanceId },
      data: {
        date: normalizedDate,
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'SCHEDULED'
      },
    });

    revalidatePath('/admin/batches');
    return { success: true };
  } catch (err: any) {
    console.error('Error rescheduling class instance:', err);
    return { success: false, error: err.message || 'Failed to reschedule class instance.' };
  }
}

/**
 * Cancel a class instance (just updates status to CANCELLED).
 */
export async function cancelClassInstance(instanceId: string) {
  try {
    await requireRole(['ADMIN']);

    const instance = await prisma.classInstance.findUnique({ where: { id: instanceId } });
    if (!instance) return { success: false, error: 'Class instance not found.' };

    if (instance.status === 'COMPLETED') {
      return { success: false, error: 'Cannot cancel a completed class.' };
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

/**
 * Bulk update timings for all future SCHEDULED classes of a batch.
 */
export async function bulkUpdateClassTimings(input: z.infer<typeof bulkUpdateClassTimingsSchema>): Promise<ActionResult> {
  await requireRole(['ADMIN']);

  const parsed = bulkUpdateClassTimingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { batchId, newStartTime, newEndTime } = parsed.data;

  try {
    const { today } = getISTDayBounds();
    
    // Note: We don't do clash prevention here on a row-by-row basis as it's a bulk operation
    // and would be complex. Assuming Admin knows what they're doing for bulk update.
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

    revalidatePath('/admin/batches');
    return { success: true };
  } catch (err: any) {
    console.error('Error bulk updating class timings:', err);
    return { success: false, error: err.message || 'Failed to update timings.' };
  }
}
