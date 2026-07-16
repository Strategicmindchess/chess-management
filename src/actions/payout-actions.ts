"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

export type BatchPayoutSummary = {
  batchId: string;
  batchName: string;
  coachName: string;
  totalSessions: number;
  totalPayout: number;
};

export async function getAdminPayoutSummary(monthString: string): Promise<BatchPayoutSummary[]> {
  await requireRole([Role.ADMIN]);

  const date = parseISO(monthString);
  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);

  const logs = await prisma.classLog.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      coach: {
        include: {
          user: true,
        },
      },
      batch: true,
    },
  });

  const batchMap = new Map<string, BatchPayoutSummary>();

  for (const log of logs) {
    if (!batchMap.has(log.batchId)) {
      batchMap.set(log.batchId, {
        batchId: log.batchId,
        batchName: log.batch.name,
        coachName: log.coach.user.name,
        totalSessions: 0,
        totalPayout: 0,
      });
    }

    const summary = batchMap.get(log.batchId)!;
    summary.totalSessions += 1;
    summary.totalPayout += log.payoutAmount;
  }

  return Array.from(batchMap.values()).sort((a, b) => b.totalPayout - a.totalPayout);
}

export async function getBatchClassLogs(batchId: string, monthString: string) {
  await requireRole([Role.ADMIN]);

  const date = parseISO(monthString);
  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);

  return await prisma.classLog.findMany({
    where: {
      batchId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      attendance: true,
    },
    orderBy: {
      date: "asc",
    },
  });
}
