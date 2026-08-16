'use server';

/**
 * fetch-actions.ts
 *
 * Student clicks "Refresh My Data" → server action:
 *  1. Check Redis lock (is a refresh already running?)
 *  2. Check last refresh timestamp (respect REFRESH_INTERVAL_MINUTES)
 *  3. Acquire lock
 *  4. Queue a chess-fetch job
 *  5. Return "Refresh started" (no API call here, no calculation here)
 *
 * Admin can queue fetch for ALL students via refreshAllStudents().
 */

import { prisma } from '@/lib/prisma';
import { requireRole, getCurrentUser } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { acquireLock, redisGet, redis } from '@/lib/redis';
import { LEADERBOARD_CONFIG, REDIS_KEYS, JOB_NAMES, QUEUE_NAMES } from '@/lib/leaderboard-config';
import { chessFetchQueue, leaderboardCalcQueue } from '@/workers/leaderboard.queues';
import { revalidatePath } from 'next/cache';
import { getCurrentPeriod } from '@/lib/leaderboard-period';

// ── Helpers ───────────────────────────────────────────────────────────────────



// ── Student self-refresh ──────────────────────────────────────────────────────

export async function requestMyDataRefresh(periodType: 'WEEKLY' | 'MONTHLY' = 'MONTHLY') {
  const user = await requireRole([Role.STUDENT]);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { chessAccount: true },
  });

  if (!studentProfile) {
    return { success: false, error: 'Student profile not found' };
  }

  const { id: studentProfileId } = studentProfile;
  const chessComUsername = studentProfile.chessAccount?.chessComUsername;
  const lichessUsername = studentProfile.chessAccount?.lichessUsername;

  if (!chessComUsername && !lichessUsername) {
    return { success: false, error: 'No chess accounts linked. Please link your Chess.com or Lichess username first.' };
  }

  // ── Check lock (already refreshing?) ─────────────────────────────────────
  const lockKey = REDIS_KEYS.refreshLock(studentProfileId);
  const lastRefreshKey = REDIS_KEYS.lastRefresh(studentProfileId);

  const lastRefreshRaw = await redis.get(lastRefreshKey);
  if (lastRefreshRaw) {
    const lastRefreshMs = parseInt(lastRefreshRaw, 10);
    const cooldownMs = LEADERBOARD_CONFIG.REFRESH_INTERVAL_MINUTES * 60 * 1000;
    const elapsedMs = Date.now() - lastRefreshMs;
    if (elapsedMs < cooldownMs) {
      const remainingMinutes = Math.ceil((cooldownMs - elapsedMs) / 60_000);
      return {
        success: false,
        cached: true,
        error: `Data refreshed recently. Please wait ${remainingMinutes} more minute(s).`,
      };
    }
  }

  const locked = await acquireLock(lockKey, 5 * 60); // 5 min lock
  if (!locked) {
    return { success: false, error: 'A refresh is already in progress. Please wait.' };
  }

  // ── Queue the fetch job ───────────────────────────────────────────────────
  const { periodStart, periodEnd } = getCurrentPeriod(periodType);

  await chessFetchQueue.add(
    JOB_NAMES.FETCH_STUDENT,
    {
      studentProfileId,
      chessComUsername: chessComUsername ?? null,
      lichessUsername: lichessUsername ?? null,
      periodType,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
    { priority: 2 } // lower priority than admin batch
  );

  return {
    success: true,
    message: 'Data refresh started. Your leaderboard score will update in a few minutes.',
    periodType,
  };
}

/** Get last refresh info for the current student */
export async function getMyRefreshStatus() {
  const user = await requireRole([Role.STUDENT]);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!studentProfile) return { lastRefreshedAt: null, isRefreshing: false };

  const sid = studentProfile.id;
  const lastRefreshRaw = await redis.get(REDIS_KEYS.lastRefresh(sid));
  const isRefreshing = await redis.exists(REDIS_KEYS.refreshLock(sid)) === 1;

  return {
    lastRefreshedAt: lastRefreshRaw ? new Date(parseInt(lastRefreshRaw, 10)) : null,
    isRefreshing,
    cooldownMinutes: LEADERBOARD_CONFIG.REFRESH_INTERVAL_MINUTES,
  };
}

// ── Admin: refresh all students ───────────────────────────────────────────────

export async function refreshAllStudents(periodType: 'WEEKLY' | 'MONTHLY' = 'MONTHLY') {
  await requireRole([Role.ADMIN]);

  const { periodStart, periodEnd } = getCurrentPeriod(periodType);

  const profiles = await prisma.studentProfile.findMany({
    where: {
      OR: [
        { chessComId: { not: null } },
        { lichessId: { not: null } },
      ],
    },
    select: {
      id: true,
      chessComId: true,
      lichessId: true,
    },
  });

  if (profiles.length === 0) {
    return { success: false, error: 'No students with linked chess accounts found.' };
  }

  // Queue jobs for all students
  const jobs = profiles.map((p) => ({
    name: JOB_NAMES.FETCH_ALL,
    data: {
      studentProfileId: p.id,
      chessComUsername: p.chessComId ?? null,
      lichessUsername: p.lichessId ?? null,
      periodType,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
    opts: { priority: 1 }, // high priority for admin batch
  }));

  await chessFetchQueue.addBulk(jobs);

  revalidatePath('/admin/leaderboard');
  return {
    success: true,
    message: `Refresh queued for ${profiles.length} students.`,
    count: profiles.length,
  };
}

/** Admin: trigger leaderboard score recalculation */
export async function triggerLeaderboardCalc(periodType: 'WEEKLY' | 'MONTHLY' = 'MONTHLY') {
  await requireRole([Role.ADMIN]);

  const { periodStart, periodEnd } = getCurrentPeriod(periodType);

  await leaderboardCalcQueue.add(
    JOB_NAMES.CALC_LEADERBOARD,
    {
      periodType,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
    { priority: 1 }
  );

  return {
    success: true,
    message: 'Leaderboard recalculation queued.',
  };
}

/** Admin: clear leaderboard Redis cache */
export async function clearLeaderboardCache(periodType: 'WEEKLY' | 'MONTHLY', periodStart: string) {
  await requireRole([Role.ADMIN]);

  const cacheKey = REDIS_KEYS.leaderboard(periodType, periodStart);
  const top10Key = REDIS_KEYS.top10(periodType, periodStart);
  await redis.del(cacheKey, top10Key);

  revalidatePath('/admin/leaderboard');
  return { success: true, message: 'Cache cleared.' };
}

