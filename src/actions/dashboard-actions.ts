'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { getISTDayBounds } from '@/lib/timezone';

export async function getTeacherDashboardData(coachProfileId: string) {
  await requireRole([Role.TEACHER]);

  const { today, tomorrow, threeDaysLater } = getISTDayBounds();

  const todayInstances = await prisma.classInstance.findMany({
    where: {
      status: { in: ['SCHEDULED', 'CANCELLED'] },
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
      status: { in: ['SCHEDULED', 'CANCELLED'] },
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

  const { today, tomorrow, threeDaysLater } = getISTDayBounds();

  const todayInstances = await prisma.classInstance.findMany({
    where: {
      status: { in: ['SCHEDULED', 'CANCELLED'] },
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
      status: { in: ['SCHEDULED', 'CANCELLED'] },
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
