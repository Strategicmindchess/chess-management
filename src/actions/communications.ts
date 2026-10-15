'use server';

import { requireRole } from '@/lib/dal';
import { sendNotification } from '@/lib/whatsapp-notifications';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { TIME_ZONE } from '@/lib/timezone';
import { sendWhatsAppMessage } from '@/services/whatsapp/client';

export interface Recipient {
  name: string;
  phone: string;
  role: string;
}

function toE164(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }
  return digits.length > 10 ? `91${digits.slice(-10)}` : `91${digits}`;
}

async function resolveRecipientsWithNames(audience: string | undefined, batch: any, meta?: any): Promise<Recipient[]> {
  const recipientsMap = new Map<string, Recipient>();

  function add(phone: string | null | undefined, name: string, role: string) {
    if (phone && phone.trim()) {
      const p = phone.trim();
      if (!recipientsMap.has(p)) {
        recipientsMap.set(p, { name, phone: p, role });
      }
    }
  }

  if (audience === 'SPECIFIC_BATCHES' && meta?.selectedBatchIds) {
    const batches = await prisma.batch.findMany({
      where: { id: { in: meta.selectedBatchIds } },
      include: {
        coach: { include: { user: true } },
        students: { include: { student: { include: { user: true } } } },
      }
    });
    for (const b of batches) {
      if (b.coach?.user.phone) add(b.coach.user.phone, b.coach.user.name, 'Coach');
      for (const bs of b.students) {
        if (bs.student.user.phone) add(bs.student.user.phone, bs.student.user.name, 'Student');
      }
    }
  } else if (audience === 'MANUAL_NUMBERS' && meta?.manualNumbers) {
    const phones = meta.manualNumbers.split(',').map((n: string) => n.trim());
    phones.forEach((p: string) => add(p, 'Manual Entry', 'Manual'));
  } else if (!audience || audience === 'BATCH_ONLY') {
    if (batch?.coach?.user.phone) add(batch.coach.user.phone, batch.coach.user.name, 'Coach');
    if (batch?.students) {
      for (const bs of batch.students) {
        if (bs.student.user.phone) add(bs.student.user.phone, bs.student.user.name, 'Student');
      }
    }
  } else if (audience === 'ALL_STUDENTS') {
    const students = await prisma.user.findMany({ where: { role: 'STUDENT', isActive: true } });
    students.forEach(s => add(s.phone || '', s.name, 'Student'));
  } else if (audience === 'ALL_COACHES') {
    const coaches = await prisma.user.findMany({ where: { role: 'TEACHER', isActive: true } });
    coaches.forEach(c => add(c.phone || '', c.name, 'Coach'));
  } else if (audience === 'EVERYONE') {
    const all = await prisma.user.findMany({ where: { role: { in: ['STUDENT', 'TEACHER'] }, isActive: true } });
    all.forEach(u => add(u.phone || '', u.name, u.role === 'TEACHER' ? 'Coach' : 'Student'));
  }

  return Array.from(recipientsMap.values());
}


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
      const t = await (prisma as any).tournamentAnnouncement?.create({
        data: {
          name: data.tournamentName,
          date: new Date(data.date),
          time: data.time,
          tournamentType: data.tournamentType,
          registrationLink: data.registrationLink,
          createdById: (await requireRole(['ADMIN'])).id,
        }
      });
      tournamentId = t?.id;
    }
    if (tournamentId) {
      await sendNotification({ type: 'TOURNAMENT', refId: tournamentId, meta: { audience: data.audience } });
    }
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

export async function prepareManualNotification(data: any) {
  const admin = await requireRole(['ADMIN']);
  
  let templateName = '';
  let templateParams: string[] = [];
  let templatePreview = '';
  let recipients: Recipient[] = [];
  let batchData = null;

  if (data.type === 'CLASS_CANCELLED' || data.type === 'CLASS_REMINDER' || data.type === 'CLASS_RESCHEDULED') {
    const instance = await prisma.classInstance.findUnique({
      where: { id: data.classInstanceId },
      include: {
        batch: {
          include: {
            coach: { include: { user: true } },
            students: { include: { student: { include: { user: true } } } },
          },
        },
      },
    });
    if (!instance) throw new Error("Class instance not found");
    batchData = instance.batch;
    const dateStr = instance.date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
    
    if (data.type === 'CLASS_REMINDER') {
      templateName = 'smc_class_reminder';
      templateParams = [instance.batch.name, dateStr, instance.startTime, instance.batch.meetLink || ''];
      templatePreview = `Reminder: Your class for batch "${templateParams[0]}" is scheduled on ${templateParams[1]} at ${templateParams[2]}. Join Link: ${templateParams[3]}`;
    } else if (data.type === 'CLASS_CANCELLED') {
      templateName = 'smc_class_cancelled';
      const timeStr = `${dateStr} at ${instance.startTime}`;
      templateParams = [instance.batch.name, timeStr];
      templatePreview = `Cancellation: Your class for batch "${templateParams[0]}" scheduled on ${templateParams[1]} has been cancelled.`;
    } else if (data.type === 'CLASS_RESCHEDULED') {
      templateName = 'smc_class_rescheduled';
      templateParams = [instance.batch.name, data.oldDate || '', data.newDate || '', data.newTime || ''];
      templatePreview = `Rescheduled: Your class for batch "${templateParams[0]}" on ${templateParams[1]} has been rescheduled to ${templateParams[2]} at ${templateParams[3]}.`;
    }
  } else if (data.type === 'HOLIDAY') {
    let holidayId = data.holidayId;
    if (!holidayId) {
      const holiday = await prisma.holidayPeriod.create({
        data: {
          name: data.holidayName,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          createdById: admin.id,
        }
      });
      holidayId = holiday.id;
    }

    templateName = 'smc_holiday';
    const startDate = new Date(data.startDate);
    const dateStr = startDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
    templateParams = [data.holidayName, dateStr];
    templatePreview = `Holiday Announcement: SMC will remain closed for "${templateParams[0]}" starting from ${templateParams[1]}.`;
  } else if (data.type === 'TOURNAMENT') {
    let tournamentId = data.tournamentId;
    
    templateName = 'smc_tournament';
    const tDate = new Date(data.date);
    const dateStr = tDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
    templateParams = [data.tournamentName, dateStr, data.time, data.tournamentType, data.registrationLink || ''];
    templatePreview = `Tournament: ${templateParams[0]} (${templateParams[3]}) on ${templateParams[1]} at ${templateParams[2]}. Register: ${templateParams[4]}`;
  }

  recipients = await resolveRecipientsWithNames(data.audience, batchData, data);

  return {
    templatePreview,
    templateName,
    templateParams,
    recipients
  };
}

export async function sendSingleNotification(phone: string, templateName: string, templateParams: string[], recipientName?: string) {
  await requireRole(['ADMIN']);
  if (templateName === 'smc_class_reminder') {
    await sendWhatsAppMessage({
      to: toE164(phone),
      templateName,
      namedParams: {
        student_name: recipientName || 'Student',
        batch_name: templateParams[0] || '',
        class_date: templateParams[1] || '',
        class_time: templateParams[2] || '',
        class_link: templateParams[3] || '',
      }
    });
  } else if (templateName === 'smc_holiday') {
    await sendWhatsAppMessage({
      to: toE164(phone),
      templateName,
      namedParams: {
        holiday_name: templateParams[0] || '',
        start_date: templateParams[1] || '',
      }
    });
  } else if (templateName === 'smc_class_cancelled') {
    await sendWhatsAppMessage({
      to: toE164(phone),
      templateName,
      namedParams: {
        batch_name: templateParams[0] || '',
        time: templateParams[1] || '',
      }
    });
  } else if (templateName === 'smc_tournament') {
    await sendWhatsAppMessage({
      to: toE164(phone),
      templateName,
      namedParams: {
        tournament_name: templateParams[0] || '',
        tournament_type: templateParams[3] || '',
        tournament_date: templateParams[1] || '',
        tournament_time: templateParams[2] || '',
        registration_link: templateParams[4] || '',
      }
    });
  } else {
    await sendWhatsAppMessage({
      to: toE164(phone),
      templateName,
      templateParams
    });
  }
  return { success: true };
}
