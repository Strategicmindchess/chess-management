/**
 * BullMQ queues for the leaderboard system.
 * chess-fetch-queue  → fetch chess API data for one student
 * leaderboard-calc-queue → recalculate scores and update LeaderboardEntry table
 */

import { Queue } from 'bullmq';
import { connection } from '@/workers/queue';
import { QUEUE_NAMES } from '@/lib/leaderboard-config';

export interface ChessFetchJobData {
  studentProfileId: string;
  chessComUsername: string | null;
  lichessUsername: string | null;
  periodType: 'WEEKLY' | 'MONTHLY';
  periodStart: string; // ISO string
  periodEnd: string;   // ISO string
}

export interface LeaderboardCalcJobData {
  periodType: 'WEEKLY' | 'MONTHLY';
  periodStart: string; // ISO string
  periodEnd: string;   // ISO string
  /** If set, only recalculate this one student */
  studentProfileId?: string;
}

export const chessFetchQueue = new Queue<ChessFetchJobData>(QUEUE_NAMES.CHESS_FETCH, {
  connection,
  defaultJobOptions: {
    attempts: 10,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: { age: 3600, count: 100 },  // Keep 1h or 100 jobs
    removeOnFail:     { age: 86400, count: 50 },  // Keep 24h or 50 failed
  },
});

export const leaderboardCalcQueue = new Queue<LeaderboardCalcJobData>(QUEUE_NAMES.LEADERBOARD_CALC, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10_000 },
    removeOnComplete: { age: 3600, count: 20 },   // Keep 1h or 20 jobs
    removeOnFail:     { age: 86400, count: 20 },
  },
});

export const logCleanupQueue = new Queue<{}>(QUEUE_NAMES.LOG_CLEANUP, {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 5,
    removeOnFail: 10,
  },
});

export interface AttendanceSummaryJobData {
  periodType: 'WEEKLY' | 'MONTHLY';
  periodStart: string; // ISO string
  periodEnd: string;   // ISO string
}

export const attendanceSummaryQueue = new Queue<AttendanceSummaryJobData>(QUEUE_NAMES.ATTENDANCE_SUMMARY, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5_000 },
    removeOnComplete: 20,
    removeOnFail: 20,
  },
});

export interface AssignmentSummaryJobData {
  periodType: 'WEEKLY' | 'MONTHLY';
  periodStart: string; // ISO string
  periodEnd: string;   // ISO string
}

export const assignmentSummaryQueue = new Queue<AssignmentSummaryJobData>(QUEUE_NAMES.ASSIGNMENT_SUMMARY, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5_000 },
    removeOnComplete: 20,
    removeOnFail: 20,
  },
});

// ─── Penalty Queue ────────────────────────────────────────────────────────────
// Scheduled daily to finalize pending ClassLog penalties after the 48h/96h window.
export const penaltyQueue = new Queue<{}>(QUEUE_NAMES.PENALTY, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 50 },
  },
});

