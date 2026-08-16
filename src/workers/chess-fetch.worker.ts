/**
 * Chess Fetch Worker — Worker 1
 *
 * Responsibilities:
 *  1. Receive a chess-fetch job (one student)
 *  2. Call Chess.com + Lichess APIs
 *  3. Normalize both responses
 *  4. Aggregate into CombinedActivity
 *  5. Save ChessActivitySnapshot to DB (always INSERT, never overwrite)
 *  6. Log the raw API response in ChessApiFetchLog
 *
 * Does NOT calculate leaderboard scores.
 * After snapshot saved, the leaderboard-calc-worker handles scoring.
 */

import { Worker, type Job } from 'bullmq';
import { connection } from '@/workers/queue';
import { QUEUE_NAMES, LEADERBOARD_CONFIG } from '@/lib/leaderboard-config';
import { prisma } from '@/lib/prisma';
import { redis, releaseLock } from '@/lib/redis';

// Chess API clients
import {
  fetchChessComStats,
  fetchChessComArchives,
  fetchChessComMonthGames,
  fetchChessComActivity,
  fetchChessComTrueStreakDates,
  type ChessComRawGame,
} from '@/services/chess/chesscom';

import {
  fetchLichessUser,
  fetchLichessActivity,
  fetchLichessGamesInRange,
  type LichessRawUser,
} from '@/services/chess/lichess';

// Normalizers
import { normalizeChessCom, normalizeLichess, extractLifetimeStats } from '@/services/chess/normalizer';
import { aggregate } from '@/services/chess/aggregator';

// Queue types
import type { ChessFetchJobData } from './leaderboard.queues';
import { logger } from '@/lib/logger';

// ──────────────────────────────────────────────────────────────────────────────

export async function processChessFetchJob(job: Job<ChessFetchJobData>) {
  const {
    studentProfileId,
    chessComUsername,
    lichessUsername,
    periodType,
    periodStart: periodStartStr,
    periodEnd: periodEndStr,
  } = job.data;

  const periodStart = new Date(periodStartStr);
  const periodEnd = new Date(periodEndStr);

  logger.job.start('chess-fetch', { studentProfileId, periodType, periodStart: periodStartStr });

  // Allow a 35-day lookback for streaks, instead of being bounded strictly to the period
  const thirtyFiveDaysAgo = new Date();
  thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);
  const activitySince = thirtyFiveDaysAgo < pStart ? thirtyFiveDaysAgo : pStart;

  // ── 1. Fetch Chess.com ────────────────────────────────────────────────────
  let chessComActivity = null;
  let chessComRawGames: ChessComRawGame[] = [];
  let chessComStats = null;

  if (chessComUsername) {
    await job.updateProgress(10);

    // Fetch stats + period games in parallel
    [chessComStats] = await Promise.all([fetchChessComStats(chessComUsername)]);

    // Get period games from archives
    const archives = await fetchChessComArchives(chessComUsername);
    const monthsNeeded = new Set<string>();
    const cur = new Date(periodStart);
    while (cur <= periodEnd) {
      monthsNeeded.add(`${cur.getFullYear()}/${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setDate(cur.getDate() + 1);
    }

    for (const archiveUrl of archives) {
      const monthKey = archiveUrl.split('/').slice(-2).join('/');
      if (!monthsNeeded.has(monthKey)) continue;
      const games = await fetchChessComMonthGames(archiveUrl);
      // Filter to period range
      const filtered = games.filter((g) => {
        const d = new Date(g.end_time * 1000);
        return d >= periodStart && d <= periodEnd;
      });
      chessComRawGames.push(...filtered);
    }

    // Fetch unbounded true active dates for streak
    const ccActiveDates = await fetchChessComTrueStreakDates(chessComUsername);

    // Log raw response (lightweight)
    await prisma.chessApiFetchLog.create({
      data: {
        studentProfileId,
        provider: 'CHESS_COM',
        periodStart,
        periodEnd,
        gameCount: chessComRawGames.length,
        rawResponse: {
          msg: 'Fetched stats and archives successfully',
        } as object,
      },
    });

    // Normalize
    chessComActivity = normalizeChessCom(
      chessComStats,
      chessComRawGames,
      chessComUsername,
      ccActiveDates
    );
  }

  await job.updateProgress(40);

  // ── 2. Fetch Lichess ──────────────────────────────────────────────────────
  let lichessActivity = null;
  let lichessUser: LichessRawUser | null = null;

  if (lichessUsername) {
    const [fetchedUser, lichessGames, lichessActivityRaw] = await Promise.all([
      fetchLichessUser(lichessUsername),
      fetchLichessGamesInRange(lichessUsername, periodStart, periodEnd),
      fetchLichessActivity(lichessUsername),
    ]);
    
    lichessUser = fetchedUser;

    // Log raw response (lightweight)
    await prisma.chessApiFetchLog.create({
      data: {
        studentProfileId,
        provider: 'LICHESS',
        periodStart,
        periodEnd,
        gameCount: lichessGames.length,
        rawResponse: {
          msg: 'Fetched lichess perfs and games successfully',
          activityDays: lichessActivityRaw.length,
        } as object,
      },
    });

    // Normalize
    lichessActivity = normalizeLichess(
        fetchedUser,
        lichessGames,
        lichessActivityRaw,
        pStart,
        pEnd,
        activitySince
      );
  }

  await job.updateProgress(75);

  // ── 3. Update Lifetime Stats ─────────────────────────────────────────────
  const lifetimeStats = extractLifetimeStats(
    chessComStats,
    lichessUser,
    chessComActivity?.activeDates ?? [],
    lichessActivity?.activeDates ?? []
  );
  await prisma.studentChessStats.upsert({
    where: { studentProfileId },
    create: {
      studentProfileId,
      ...lifetimeStats,
    },
    update: {
      ...lifetimeStats,
      lastSyncedAt: new Date(),
    },
  });

  // ── 4. Aggregate ─────────────────────────────────────────────────────────
  const combined = aggregate(chessComActivity, lichessActivity);

  // ── 4. Fetch rating baseline (for improvement bonus) ─────────────────────
  // Look up previous snapshot to get rapidRatingStart
  const prevSnapshot = await prisma.chessActivitySnapshot.findFirst({
    where: {
      studentProfileId,
      periodType,
      periodStart: { lt: periodStart },
    },
    orderBy: { periodStart: 'desc' },
    select: { rapidRatingEnd: true },
  });

  // Prefer the actual rating from their first game this month!
  // Fallback to previous month's ending rating if they haven't played yet this month.
  // Fallback to current rating if there is no previous month.
  const rapidRatingStart = combined.rapidRatingStart ?? prevSnapshot?.rapidRatingEnd ?? combined.rapidRating ?? null;
  const rapidRatingEnd = combined.rapidRating ?? null;

  // ── 5. Save snapshot (always INSERT — never overwrite for history) ─────────
  await prisma.chessActivitySnapshot.upsert({
    where: {
      studentProfileId_periodType_periodStart: {
        studentProfileId,
        periodType,
        periodStart,
      },
    },
    create: {
      studentProfileId,
      periodType,
      periodStart,
      periodEnd,
      rapidGames: combined.rapidGames,
      blitzGames: combined.blitzGames,
      classicalGames: combined.classicalGames,
      bulletGames: combined.bulletGames,
      ultraBulletGames: combined.ultraBulletGames,
      rapidWins: combined.rapidWins,
      blitzWins: combined.blitzWins,
      classicalWins: combined.classicalWins,
      puzzleAttempts: combined.puzzleAttempts,
      puzzleSolved: combined.puzzleSolved,
      rapidRatingStart,
      rapidRatingEnd,
      streakDays: combined.streakDays,
      streakStartDate: combined.streakStartDate ?? undefined,
    },
    update: {
      rapidGames: combined.rapidGames,
      blitzGames: combined.blitzGames,
      classicalGames: combined.classicalGames,
      bulletGames: combined.bulletGames,
      ultraBulletGames: combined.ultraBulletGames,
      rapidWins: combined.rapidWins,
      blitzWins: combined.blitzWins,
      classicalWins: combined.classicalWins,
      puzzleAttempts: combined.puzzleAttempts,
      puzzleSolved: combined.puzzleSolved,
      rapidRatingEnd,
      streakDays: combined.streakDays,
      streakStartDate: combined.streakStartDate ?? undefined,
    },
  });

  // ── 6. Update last refresh timestamp in Redis ─────────────────────────────
  const lockKey = `lock:refresh:${studentProfileId}`;
  const lastRefreshKey = `lastRefresh:${studentProfileId}`;
  await redis.set(lastRefreshKey, Date.now().toString(), 'EX', 7 * 24 * 60 * 60); // 7 days
  await releaseLock(lockKey);

  await job.updateProgress(100);

  console.log(
    `[ChessFetchWorker] Snapshot saved for ${studentProfileId}. ` +
    `Rapid: ${combined.rapidGames}, Blitz: ${combined.blitzGames}, ` +
    `Puzzles: ${combined.puzzleSolved}/${combined.puzzleAttempts}, ` +
    `Streak: ${combined.streakDays}d`
  );

  return {
    studentProfileId,
    rapidGames: combined.rapidGames,
    blitzGames: combined.blitzGames,
    puzzleSolved: combined.puzzleSolved,
    streakDays: combined.streakDays,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Worker instance
// ──────────────────────────────────────────────────────────────────────────────

export const chessFetchWorker = new Worker<ChessFetchJobData>(
  QUEUE_NAMES.CHESS_FETCH,
  async (job) => {
    if (job.name === 'fetch-student' || job.name === 'fetch-all') {
      return processChessFetchJob(job);
    }
  },
  {
    connection,
    concurrency: LEADERBOARD_CONFIG.MAX_FETCH_CONCURRENCY,
    limiter: {
      // Rate limit: max 5 jobs per 10s to respect Chess.com API limits
      max: 5,
      duration: 10_000,
    },
  }
);

chessFetchWorker.on('completed', (job, result) => {
  logger.job.success('chess-fetch', { jobId: job.id, studentProfileId: result?.studentProfileId });
});

chessFetchWorker.on('failed', (job, err) => {
  logger.job.fail('chess-fetch', { jobId: job?.id, studentProfileId: job?.data?.studentProfileId, error: err.message });
  if (job?.data?.studentProfileId) {
    releaseLock(`lock:refresh:${job.data.studentProfileId}`).catch(() => {});
  }
});
