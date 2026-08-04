'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { startOfDay } from 'date-fns';

export async function getTeacherDashboardData(coachProfileId: string) {
  await requireRole([Role.TEACHER]);

  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const threeDaysLater = new Date(tomorrow);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const todayInstances = await prisma.classInstance.findMany({
    where: {
      status: 'SCHEDULED',
      date: {
        gte: today,
        lt: tomorrow
      },
      batch: {
        coachProfileId,
        isActive: true
      }
    },
    include: {
      batch: {
        include: {
          students: { include: { student: { include: { user: true } } } }
        }
      }
    },
    orderBy: [{ startTime: 'asc' }]
  });

  const upcomingInstances = await prisma.classInstance.findMany({
    where: {
      status: 'SCHEDULED',
      date: {
        gte: tomorrow,
        lt: threeDaysLater
      },
      batch: {
        coachProfileId,
        isActive: true
      }
    },
    include: {
      batch: {
        include: {
          students: { include: { student: { include: { user: true } } } }
        }
      }
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
  });

  return { todayInstances, upcomingInstances };
}

export async function getStudentDashboardData(studentProfileId: string) {
  await requireRole([Role.STUDENT]);

  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const threeDaysLater = new Date(tomorrow);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const todayInstances = await prisma.classInstance.findMany({
    where: {
      status: 'SCHEDULED',
      date: {
        gte: today,
        lt: tomorrow
      },
      batch: {
        students: { some: { studentProfileId } },
        isActive: true
      }
    },
    include: {
      batch: {
        include: {
          coach: { include: { user: true } }
        }
      }
    },
    orderBy: [{ startTime: 'asc' }]
  });

  const upcomingInstances = await prisma.classInstance.findMany({
    where: {
      status: 'SCHEDULED',
      date: {
        gte: tomorrow,
        lt: threeDaysLater
      },
      batch: {
        students: { some: { studentProfileId } },
        isActive: true
      }
    },
    include: {
      batch: {
        include: {
          coach: { include: { user: true } }
        }
      }
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
  });

  return { todayInstances, upcomingInstances };
}
