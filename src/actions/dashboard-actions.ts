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

// ─── Admin Dashboard Stats ────────────────────────────────────────────────────
export async function getAdminDashboardStats() {
  await requireRole([Role.ADMIN]);

  const { today, tomorrow } = getISTDayBounds();

  const now = new Date();
  const monthString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const startOfM = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfM   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    studentCount,
    coachCount,
    activeBatchCount,
    employeeCount,
    // Tickets
    pendingStudentTickets,
    pendingCoachTickets,
    // Fees
    pendingFees,
    // Today's classes
    todayClassCount,
    // Monthly payout from class logs
    monthlyCoachPayout,
  ] = await Promise.all([
    prisma.user.count({ where: { role: Role.STUDENT, isActive: true } }),
    prisma.user.count({ where: { role: Role.TEACHER, isActive: true } }),
    prisma.batch.count({ where: { isActive: true } }),
    prisma.employeeProfile.count({ where: { isActive: true } }),
    // Coach-created tickets pending
    prisma.ticket.count({ where: { status: "PENDING", coachCreatedById: null } }),
    prisma.ticket.count({ where: { status: "PENDING", coachCreatedById: { not: null } } }),
    // Fee cycles with status PENDING
    prisma.feeCycle.count({ where: { status: "UNPAID" } }),

    // Today's scheduled classes
    prisma.classInstance.count({
      where: { status: "SCHEDULED", date: { gte: today, lt: tomorrow } },
    }),
    // Sum of all class log payouts for current month
    prisma.classLog.aggregate({
      where: { date: { gte: startOfM, lte: endOfM } },
      _sum: { payoutAmount: true },
    }),
  ]);

  // Employee monthly payout estimate (fixed salaries of active employees)
  const activeEmployees = await prisma.employeeProfile.findMany({
    where: { isActive: true },
    select: { fixedSalary: true, tdsApplicable: true },
  });
  const staffGross = activeEmployees.reduce((acc, e) => acc + e.fixedSalary, 0);
  const staffTds   = activeEmployees.reduce((acc, e) => acc + (e.tdsApplicable ? Math.round(e.fixedSalary * 0.1) : 0), 0);
  const staffNet   = staffGross - staffTds;

  const coachGross = monthlyCoachPayout._sum.payoutAmount ?? 0;

  return {
    studentCount,
    coachCount,
    activeBatchCount,
    employeeCount,
    pendingStudentTickets,
    pendingCoachTickets,
    pendingFees,
    todayClassCount,
    monthString,
    coachGross,
    staffNet,
    totalPayoutEstimate: coachGross + staffNet,
  };
}


