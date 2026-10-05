'use server';

import { requireRole } from '@/lib/dal';
import { sendNotification } from '@/lib/whatsapp-notifications';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { TIME_ZONE } from '@/lib/timezone';

export async function manualNotify(data: any) {
  await requireRole(['ADMIN']);
  
  if (data.type === 'CLASS_CANCELLED') {
    await sendNotification({ type: 'CLASS_CANCELLED', refId: data.classInstanceId, meta: { audience: data.audience } });
  } else if (data.type === 'CLASS_REMINDER') {
    await sendNotification({ type: 'CLASS_REMINDER', refId: data.classInstanceId, meta: { audience: data.audience } });
  } else if (data.type === 'CLASS_RESCHEDULED') {
    await sendNotification({ 
      type: 'CLASS_RESCHEDULED', 
      refId: data.classInstanceId, 
      meta: { newDate: data.newDate, newTime: data.newTime, audience: data.audience } 
    });
  } else if (data.type === 'HOLIDAY') {
    // Basic mock creation if no holiday period provided
    let holidayId = data.holidayId;
    if (!holidayId) {
      const holiday = await prisma.holidayPeriod.create({
        data: {
          name: data.holidayName,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          createdById: (await requireRole(['ADMIN'])).id,
        }
      });
      holidayId = holiday.id;
    }
    await sendNotification({ type: 'HOLIDAY', refId: holidayId, meta: { audience: data.audience } });
  } else if (data.type === 'TOURNAMENT') {
    let tournamentId = data.tournamentId;
    if (!tournamentId) {
      const t = await prisma.tournamentAnnouncement.create({
        data: {
          name: data.tournamentName,
          date: new Date(data.date),
          time: data.time,
          tournamentType: data.tournamentType,
          registrationLink: data.registrationLink,
          createdById: (await requireRole(['ADMIN'])).id,
        }
      });
      tournamentId = t.id;
    }
    await sendNotification({ type: 'TOURNAMENT', refId: tournamentId, meta: { audience: data.audience } });
  }

  return { success: true };
}

export async function getActiveBatches() {
  await requireRole(['ADMIN']);
  return prisma.batch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, type: true },
    orderBy: { name: 'asc' }
  });
}

export async function getBatchClasses(batchId: string) {
  await requireRole(['ADMIN']);
  const now = new Date();
  const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  return prisma.classInstance.findMany({
    where: { 
      batchId,
      date: { gte: pastWeek, lte: nextMonth }
    },
    select: { id: true, date: true, startTime: true, endTime: true, status: true, lectureName: true },
    orderBy: { date: 'desc' }
  });
}
