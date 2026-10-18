'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { getISTDayBounds } from '@/lib/timezone';
import { whatsappQueue } from '@/workers/leaderboard.queues';
import { logger } from '@/lib/logger';

export interface NotifyClassResponse {
  success: boolean;
  message?: string;
  reminderSentAt?: string;
  error?: string;
}

/**
 * Server Action: Coach-Triggered Manual Class Reminder (Queue + Atomic Lock)
 * 
 * Rules Enforced:
 * 1. Role: Must be logged-in Coach (TEACHER) or ADMIN.
 * 2. Ownership: Coach can only notify their own assigned batch.
 * 3. Today Check: Class must be scheduled for TODAY in IST.
 * 4. Active Check: Class must not be CANCELLED or COMPLETED.
 * 5. Idempotency (Atomic Lock): reminderSentAt MUST be null. Once set, subsequent calls are rejected.
 * 6. BullMQ Queue: Dispatches 'CLASS_REMINDER' job to background queue for instant (<50ms) UI response.
 */
export async function notifyClassStudentsAction(
  classInstanceId: string,
  batchId?: string,
  selectedStudentIds?: string[]
): Promise<NotifyClassResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.TEACHER && user.role !== Role.ADMIN)) {
      return { success: false, error: 'Unauthorized: Only teachers or admins can notify class students.' };
    }

    // 1. Fetch Class Instance & Batch
    const instance = await prisma.classInstance.findUnique({
      where: { id: classInstanceId },
      include: {
        batch: {
          include: {
            coach: true,
          },
        },
      },
    });

    if (!instance || !instance.batch) {
      return { success: false, error: 'Class instance or batch not found.' };
    }

    // 2. Validate batchId match if provided
    if (batchId && instance.batchId !== batchId) {
      return { success: false, error: 'Selected batch does not match this class instance.' };
    }

    // 3. Ownership check (Teachers can only notify their own batch)
    if (user.role === Role.TEACHER && instance.batch.coach?.userId !== user.id) {
      return { success: false, error: 'You are not assigned to coach this batch.' };
    }

    // 4. Status Check
    if (instance.status === 'CANCELLED') {
      return { success: false, error: 'Cannot send reminder for a cancelled class.' };
    }
    if (instance.status === 'COMPLETED') {
      return { success: false, error: 'This class has already ended.' };
    }

    // 5. "Today Only" Check (IST)
    const { today, tomorrow } = getISTDayBounds();
    const classDate = new Date(instance.date);
    if (classDate < today || classDate >= tomorrow) {
      return { success: false, error: 'Reminders can only be sent on the day of the class.' };
    }

    // 6. 1-Hour Window Check (Cannot send earlier than 1 hour before class starts)
    const { getISTNow } = await import('@/lib/timezone');
    const istNow = getISTNow();

    // Parse instance.startTime (e.g. "16:00") into today's IST timestamp
    const [startH, startM] = instance.startTime.split(':').map(Number);
    const classStartIST = new Date(istNow);
    classStartIST.setHours(startH, startM, 0, 0);

    const oneHourBeforeClass = new Date(classStartIST.getTime() - 60 * 60 * 1000);

    if (user.role === Role.TEACHER && istNow < oneHourBeforeClass) {
      const allowedFromStr = oneHourBeforeClass.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        success: false,
        error: `Reminders can only be sent within 1 hour before class starts (available from ${allowedFromStr}).`,
      };
    }

    // Parse instance.endTime (e.g. "17:00") - check if class already ended
    const [endH, endM] = instance.endTime.split(':').map(Number);
    const classEndIST = new Date(istNow);
    classEndIST.setHours(endH, endM, 0, 0);

    if (istNow > classEndIST) {
      return { success: false, error: 'This class has already ended.' };
    }

    // 7. Already Sent Check (Idempotency)
    const instReminderSentAt = (instance as any).reminderSentAt;
    if (instReminderSentAt) {
      const sentTimeStr = new Date(instReminderSentAt).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        success: false,
        error: `Reminder has already been sent for this class at ${sentTimeStr}.`,
        reminderSentAt: new Date(instReminderSentAt).toISOString(),
      };
    }

    const now = new Date();

    // 8. Direct Dispatch via Meta Cloud API (100% Direct synchronous delivery, no worker/queue)
    const { sendClassReminderService } = await import('@/services/whatsapp/class-reminder.service');
    let reminderResult;
    try {
      reminderResult = await sendClassReminderService(classInstanceId, { targetStudentIds: selectedStudentIds });
      logger.info({ classInstanceId, reminderResult }, '[ClassReminder] Directly dispatched reminders via sendClassReminderService');
    } catch (err: any) {
      logger.error({ error: err?.message, classInstanceId }, '[ClassReminder] Error in direct sendClassReminderService');
      return {
        success: false,
        error: err?.message || 'Failed to dispatch WhatsApp notifications.',
      };
    }

    if (reminderResult.failed > 0 && reminderResult.sent === 0) {
      const errMsg = reminderResult.errors[0]?.error || 'Failed to deliver message via WhatsApp gateway.';
      logger.error({ classInstanceId, errors: reminderResult.errors }, '[ClassReminder] All recipients failed to deliver');
      return {
        success: false,
        error: errMsg,
      };
    }

    // 9. Update DB only on success (locks button with tick mark)
    try {
      await prisma.classInstance.update({
        where: { id: classInstanceId },
        data: {
          reminderSentAt: now,
          reminderSentBy: user.id,
        },
      });
      logger.info({ classInstanceId }, '[ClassReminder] Successfully recorded reminderSentAt in database');
    } catch (dbErr: any) {
      logger.warn({ error: dbErr?.message }, '[ClassReminder] Could not update reminderSentAt in database');
    }

    revalidatePath('/teacher');
    revalidatePath('/teacher/batches');
    revalidatePath('/admin/communications');

    return {
      success: true,
      message: `Sent WhatsApp reminder to ${reminderResult.sent} recipient(s) directly!`,
      reminderSentAt: now.toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error?.message, classInstanceId }, '[ClassReminder] Failed to trigger reminder');
    return {
      success: false,
      error: error?.message || 'Failed to trigger reminder notification.',
    };
  }
}

export interface AdminTodayClassItem {
  id: string;
  batchId: string;
  batchName: string;
  batchCode: string;
  coachName: string;
  coachPhone?: string;
  startTime: string;
  endTime: string;
  status: string;
  studentCount: number;
  students: Array<{ id: string; name: string; phone?: string }>;
  reminderSentAt?: string | null;
  reminderSentByName?: string | null;
  meetLink?: string;
  batchType?: string;
}

/**
 * Server Action: Fetches all of today's scheduled classes across the academy for Admin
 */
export async function getAdminTodayClassesAction(): Promise<AdminTodayClassItem[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    throw new Error('Unauthorized: Only administrators can view all academy classes.');
  }

  const { today, tomorrow } = getISTDayBounds();

  const instances = await prisma.classInstance.findMany({
    where: {
      date: { gte: today, lt: tomorrow },
      batch: { isActive: true },
    },
    include: {
      batch: {
        include: {
          coach: { include: { user: true } },
          students: { include: { student: { include: { user: true } } } },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  // Fetch names of users who sent reminders if any
  const sentByUserIds = instances.map((i) => (i as any).reminderSentBy).filter(Boolean) as string[];
  const sentByUsers =
    sentByUserIds.length > 0
      ? await prisma.user.findMany({
        where: { id: { in: sentByUserIds } },
        select: { id: true, name: true, role: true },
      })
      : [];
  const userMap = new Map(sentByUsers.map((u) => [u.id, u.name]));

  return instances.map((inst) => {
    return {
      id: inst.id,
      batchId: inst.batchId,
      batchName: inst.batch.name,
      batchCode: inst.batch.code,
      coachName: inst.batch.coach?.user?.name || 'Unassigned Coach',
      coachPhone: inst.batch.coach?.user?.phone || undefined,
      startTime: inst.startTime,
      endTime: inst.endTime,
      status: inst.status,
      studentCount: inst.batch.students.length,
      students: inst.batch.students.map((bs) => ({
        id: bs.student.id,
        name: bs.student?.user?.name || bs.student?.parentName || 'Student',
        phone: bs.student?.user?.phone || bs.student?.parentPhone || undefined,
      })),
      reminderSentAt: (inst as any).reminderSentAt ? (inst as any).reminderSentAt.toISOString() : null,
      reminderSentByName: (inst as any).reminderSentBy ? (userMap.get((inst as any).reminderSentBy) || 'Admin') : null,
      meetLink: inst.batch.meetLink,
      batchType: inst.batch.type,
    };
  });
}

/**
 * Server Action: Fetches enrolled students for a class instance or batch for the Notify modal
 */
export async function getClassStudentsForModalAction(
  classInstanceId?: string,
  batchId?: string
): Promise<Array<{ id: string; name: string; phone?: string }>> {
  try {
    let resolvedBatchId = batchId;

    if (!resolvedBatchId && classInstanceId) {
      const instance = await prisma.classInstance.findUnique({
        where: { id: classInstanceId },
        select: { batchId: true },
      });
      resolvedBatchId = instance?.batchId;
    }

    if (!resolvedBatchId) return [];

    const batchStudents = await prisma.batchStudent.findMany({
      where: { batchId: resolvedBatchId },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, phone: true },
            },
          },
        },
      },
    });

    return batchStudents.map((bs) => ({
      id: bs.student.id,
      name: bs.student.user?.name || bs.student.parentName || 'Student',
      phone: bs.student.user?.phone || bs.student.parentPhone || undefined,
    }));
  } catch (err: any) {
    console.error('[getClassStudentsForModalAction Error]:', err.message);
    return [];
  }
}

