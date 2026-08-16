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
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 86400, count: 500 },
  },
});

export const leaderboardCalcQueue = new Queue<LeaderboardCalcJobData>(QUEUE_NAMES.LEADERBOARD_CALC, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10_000 },
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 86400, count: 500 },
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
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});
