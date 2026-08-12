/**
 * BullMQ queues for the leaderboard system.
 * chess-fetch-queue  → fetch chess API data for one student
 * leaderboard-calc-queue → recalculate scores and update LeaderboardEntry table
 */

import { Queue } from 'bullmq';
import { connection } from '@/jobs/queue';
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
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const leaderboardCalcQueue = new Queue<LeaderboardCalcJobData>(QUEUE_NAMES.LEADERBOARD_CALC, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10_000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});
