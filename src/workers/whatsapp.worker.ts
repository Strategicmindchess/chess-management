import { Worker } from 'bullmq';
import { connection } from '@/workers/queue';
import { WhatsAppJobData } from '@/workers/leaderboard.queues';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/services/whatsapp/client';
import { logger } from '@/lib/logger';

function toE164(phone: string): string {
  // Strip non-digits, prepend 91 if 10-digit Indian number
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('91') ? digits : `91${digits}`;
}

export const whatsappWorker = new Worker<WhatsAppJobData>(
  'whatsapp-queue',
  async (job) => {
    const { type, refId, meta } = job.data;
    logger.info({ type, refId }, '[WA Worker] Processing job');

    switch (type) {
      case 'CLASS_REMINDER':    return handleClassReminder(refId, meta);
      case 'CLASS_CANCELLED':   return handleClassCancelled(refId, meta);
      case 'CLASS_RESCHEDULED': return handleClassRescheduled(refId, meta);
      case 'HOLIDAY':           return handleHoliday(refId, meta);
      case 'TOURNAMENT':        return handleTournament(refId, meta);
    }
  },
  { connection, concurrency: 2 }
);

// ── Handlers ──────────────────────────────────────────────────────────────────

async function resolvePhones(audience: string | undefined, batch: any, meta?: any): Promise<string[]> {
  let phones: string[] = [];
  
  if (audience === 'SPECIFIC_BATCHES' && meta?.selectedBatchIds) {
    const batches = await prisma.batch.findMany({
      where: { id: { in: meta.selectedBatchIds } },
      include: {
        coach: { include: { user: true } },
        students: { include: { student: { include: { user: true } } } },
      }
    });
    for (const b of batches) {
      if (b.coach?.user.phone) phones.push(b.coach.user.phone);
      for (const bs of b.students) {
        if (bs.student.user.phone) phones.push(bs.student.user.phone);
      }
    }
  } else if (audience === 'MANUAL_NUMBERS' && meta?.manualNumbers) {
    phones = meta.manualNumbers.split(',').map((n: string) => n.trim());
  } else if (!audience || audience === 'BATCH_ONLY') {
    if (batch?.coach?.user.phone) phones.push(batch.coach.user.phone);
    if (batch?.students) {
      for (const bs of batch.students) {
        if (bs.student.user.phone) phones.push(bs.student.user.phone);
      }
    }
  } else if (audience === 'ALL_STUDENTS') {
    const students = await prisma.user.findMany({ where: { role: 'STUDENT', isActive: true }, select: { phone: true } });
    phones = students.map(s => s.phone).filter(Boolean) as string[];
  } else if (audience === 'ALL_COACHES') {
    const coaches = await prisma.user.findMany({ where: { role: 'TEACHER', isActive: true }, select: { phone: true } });
    phones = coaches.map(c => c.phone).filter(Boolean) as string[];
  } else if (audience === 'EVERYONE') {
    const all = await prisma.user.findMany({ where: { role: { in: ['STUDENT', 'TEACHER'] }, isActive: true }, select: { phone: true } });
    phones = all.map(u => u.phone).filter(Boolean) as string[];
  }
  
  // Deduplicate
  return Array.from(new Set(phones));
}

async function handleClassReminder(classInstanceId: string, meta?: any) {
  const instance = await prisma.classInstance.findUnique({
    where: { id: classInstanceId },
    include: {
      batch: {
        include: {
          coach: { include: { user: true } },
          students: { include: { student: { include: { user: true } } } },
        },
      },
    },
  });
  if (!instance) return;

  const phones = await resolvePhones(meta?.audience, instance.batch, meta);
  const dateStr = instance.date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

  for (const phone of phones) {
    await sendWhatsAppMessage({
      to: toE164(phone),
      templateName: 'smc_class_reminder',
      templateParams: [instance.batch.name, dateStr, instance.startTime, instance.batch.meetLink],
    });
  }
}

async function handleClassCancelled(classInstanceId: string, meta?: any) {
  const instance = await prisma.classInstance.findUnique({
    where: { id: classInstanceId },
    include: {
      batch: {
        include: {
          coach: { include: { user: true } },
          students: { include: { student: { include: { user: true } } } },
        },
      },
    },
  });
  if (!instance) return;

  const phones = await resolvePhones(meta?.audience, instance.batch, meta);
  const dateStr = instance.date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

  for (const phone of phones) {
    await sendWhatsAppMessage({
      to: toE164(phone),
      templateName: 'smc_class_cancelled',
      templateParams: [instance.batch.name, dateStr],
    });
  }
}

async function handleClassRescheduled(classInstanceId: string, meta?: any) {
  const instance = await prisma.classInstance.findUnique({
    where: { id: classInstanceId },
    include: {
      batch: {
        include: {
          coach: { include: { user: true } },
          students: { include: { student: { include: { user: true } } } },
        },
      },
    },
  });
  if (!instance || !meta) return;

  const phones = await resolvePhones(meta?.audience, instance.batch, meta);

  for (const phone of phones) {
    await sendWhatsAppMessage({
      to: toE164(phone),
      templateName: 'smc_class_rescheduled',
      templateParams: [instance.batch.name, meta.oldDate || '', meta.newDate || '', meta.newTime || ''],
    });
  }
}

async function handleHoliday(holidayId: string, meta?: any) {
  const holiday = await prisma.holidayPeriod.findUnique({ where: { id: holidayId } });
  if (!holiday) return;

  // Default to EVERYONE if no audience specified for holiday
  const audience = meta?.audience || 'EVERYONE';
  const phones = await resolvePhones(audience, null, meta);

  const dateStr = holiday.startDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

  for (const phone of phones) {
    await sendWhatsAppMessage({
      to: toE164(phone),
      templateName: 'smc_holiday',
      templateParams: [holiday.name, dateStr],
    });
  }
}

async function handleTournament(tournamentId: string, meta?: any) {
  const t = await prisma.tournamentAnnouncement.findUnique({ where: { id: tournamentId } });
  if (!t) return;

  const audience = meta?.audience || 'EVERYONE';
  const phones = await resolvePhones(audience, null, meta);

  const dateStr = t.date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

  for (const phone of phones) {
    await sendWhatsAppMessage({
      to: toE164(phone),
      templateName: 'smc_tournament',
      templateParams: [t.name, dateStr, t.time, t.tournamentType, t.registrationLink || ''],
    });
  }
}

