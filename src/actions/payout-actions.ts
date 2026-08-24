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

export type CoachPayoutSummary = {
  coachId: string;
  coachName: string;
  employmentType: string;
  tdsApplicable: boolean;
  totalSessions: number;
  grossPayout: number;
  totalPenalties: number;
  totalAdjustments: number;
  tdsAmount: number;
  netPayout: number;
  batches: {
    batchId: string;
    batchName: string;
    sessions: number;
    payout: number;
    penalties: number;
  }[];
  adjustments: {
    id: string;
    type: string;
    amount: number;
    reason: string;
  }[];
};

export async function getCoachPayoutSummary(monthString: string): Promise<CoachPayoutSummary[]> {
  await requireRole([Role.ADMIN]);

  const date = parseISO(monthString);
  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);

  const logs = await prisma.classLog.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: {
      coach: { include: { user: true } },
      batch: true,
    },
  });

  const coaches = await prisma.coachProfile.findMany({
    where: { id: { in: [...new Set(logs.map(l => l.coachProfileId))] } },
    include: {
      user: true,
      payoutAdjustments: { where: { month: monthString } },
    },
  });

  const coachMap = new Map<string, CoachPayoutSummary>();

  for (const log of logs) {
    const coachProfile = coaches.find(c => c.id === log.coachProfileId);
    if (!coachProfile) continue;

    if (!coachMap.has(log.coachProfileId)) {
      coachMap.set(log.coachProfileId, {
        coachId: log.coachProfileId,
        coachName: log.coach.user.name,
        employmentType: coachProfile.employmentType,
        tdsApplicable: coachProfile.tdsApplicable,
        totalSessions: 0,
        grossPayout: 0,
        totalPenalties: 0,
        totalAdjustments: 0,
        tdsAmount: 0,
        netPayout: 0,
        batches: [],
        adjustments: coachProfile.payoutAdjustments.map(a => ({
          id: a.id,
          type: a.type,
          amount: a.amount,
          reason: a.reason,
        })),
      });
    }

    const summary = coachMap.get(log.coachProfileId)!;
    summary.totalSessions += 1;
    summary.grossPayout += log.payoutAmount;

    const penalty = log.penaltyWaived ? 0 : (log.penaltyAmount ?? 0);
    summary.totalPenalties += penalty;

    // Batch breakdown
    const batchEntry = summary.batches.find(b => b.batchId === log.batchId);
    if (batchEntry) {
      batchEntry.sessions += 1;
      batchEntry.payout += log.payoutAmount;
      batchEntry.penalties += penalty;
    } else {
      summary.batches.push({
        batchId: log.batchId,
        batchName: log.batch.name,
        sessions: 1,
        payout: log.payoutAmount,
        penalties: penalty,
      });
    }
  }

  // Post-process: add adjustments and calculate TDS + net
  for (const summary of coachMap.values()) {
    summary.totalAdjustments = summary.adjustments.reduce((acc, a) => acc + a.amount, 0);
    const beforeTds = summary.grossPayout - summary.totalPenalties + summary.totalAdjustments;
    summary.tdsAmount = summary.tdsApplicable ? Math.round(beforeTds * 0.1) : 0;
    summary.netPayout = beforeTds - summary.tdsAmount;
  }

  return Array.from(coachMap.values()).sort((a, b) => b.grossPayout - a.grossPayout);
}

