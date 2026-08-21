'use server';

/**
 * leaderboard-actions.ts
 *
 * Pure read operations: SELECT * FROM LeaderboardEntry ORDER BY score DESC.
 * No business logic, no calculation, no API calls.
 * Reads from Redis cache first, falls back to DB, then caches the result.
 */

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { redisGet, redisSet } from '@/lib/redis';
import { REDIS_KEYS, LEADERBOARD_CONFIG } from '@/lib/leaderboard-config';
import { getCurrentPeriod } from '@/lib/leaderboard-period';

export interface LeaderboardRow {
  rank: number;
  studentProfileId: string;
  studentName: string;
  profilePictureUrl: string | null;
  totalScore: number;
  chessComUsername: string | null;
  lichessUsername: string | null;
  isDisqualified: boolean;
  // Admin-only data quality flags
  isDataStale: boolean;    // snapshot not updated in 2+ days
  ccFetchFailed: boolean;  // latest Chess.com fetch had success:false
  liFetchFailed: boolean;  // latest Lichess fetch had success:false
  breakdown: {
    rapidClassicalPoints: number;
    blitzPoints: number;
    puzzlePoints: number;
    winRateBonus: number;
    puzzleAccuracyBonus: number;
    ratingBonus: number;
    consistencyBonus: number;
    coachFeedback: number;
    attendance: number;
    assignment: number;
    tournament: number;
    bulletPenalty: number;
  };
  rawStats: {
    rapidClassicalGames: number;
    blitzGames: number;
    puzzleSolved: number;
    winRate: number;
    puzzleAccuracy: number;
    ratingStart: number;
    ratingEnd: number;
    streakDays: number;
  };
}

/** Get the full leaderboard for a period. Redis → DB fallback. */
export async function getLeaderboard(
  periodType: 'WEEKLY' | 'MONTHLY',
  periodStart?: string
): Promise<{ entries: LeaderboardRow[]; calculatedAt: Date | null; puzzleSolverAward: unknown }> {
  const user = await getCurrentUser();

  // Default to current period
  const periodObj = getCurrentPeriod(periodType);
  const resolvedPeriodStart: Date = periodStart ? new Date(periodStart) : periodObj.periodStart;
  const start = periodStart ?? resolvedPeriodStart.toISOString();

  // ── Redis cache ───────────────────────────────────────────────────────────
  const cacheKey = REDIS_KEYS.leaderboard(periodType, start);
  const cached = await redisGet<{ entries: LeaderboardRow[]; calculatedAt: string | null; puzzleSolverAward: unknown }>(cacheKey);
  if (cached) {
    return {
      entries: cached.entries,
      calculatedAt: cached.calculatedAt ? new Date(cached.calculatedAt) : null,
      puzzleSolverAward: cached.puzzleSolverAward,
    };
  }

  // ── DB query ──────────────────────────────────────────────────────────────
  const [dbEntries, puzzleSolverAward, failedFetchLogs] = await Promise.all([
    prisma.leaderboardEntry.findMany({
      where: {
        periodType,
        periodStart: resolvedPeriodStart,
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, profilePictureUrl: true } },
            chessAccount: { select: { chessComUsername: true, lichessUsername: true } },
          },
        },
        snapshot: true,
      },
      orderBy: { rank: 'asc' },
    }),

    prisma.puzzleSolverAward.findUnique({
      where: {
        periodType_periodStart: {
          periodType,
          periodStart: resolvedPeriodStart,
        },
      },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
      },
    }),

    // Fetch latest failed fetch logs for this period
    prisma.chessApiFetchLog.findMany({
      where: {
        periodStart: resolvedPeriodStart,
        success: false,
      },
      select: { studentProfileId: true, provider: true },
    }),
  ]);

  // Build failure sets for quick lookup
  const ccFailedSet = new Set(failedFetchLogs.filter(l => l.provider === 'CHESS_COM').map(l => l.studentProfileId));
  const liFailedSet = new Set(failedFetchLogs.filter(l => l.provider === 'LICHESS').map(l => l.studentProfileId));
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const entries: LeaderboardRow[] = dbEntries.map((e) => ({
    rank: e.rank ?? 999,
    studentProfileId: e.studentProfileId,
    studentName: e.student.user.name,
    profilePictureUrl: e.student.user.profilePictureUrl,
    totalScore: e.totalScore,
    chessComUsername: e.student.chessAccount?.chessComUsername ?? null,
    lichessUsername: e.student.chessAccount?.lichessUsername ?? null,
    isDisqualified: e.isDisqualified,
    isDataStale: e.snapshot ? e.snapshot.updatedAt < twoDaysAgo : false,
    ccFetchFailed: ccFailedSet.has(e.studentProfileId),
    liFetchFailed: liFailedSet.has(e.studentProfileId),
    breakdown: {
      rapidClassicalPoints: e.rapidClassicalPoints,
      blitzPoints: e.blitzPoints,
      puzzlePoints: e.puzzlePoints,
      winRateBonus: e.winRateBonus,
      puzzleAccuracyBonus: e.puzzleAccuracyBonus,
      ratingBonus: e.ratingBonus,
      consistencyBonus: e.consistencyBonus,
      coachFeedback: e.coachFeedback,
      attendance: e.attendance,
      assignment: e.assignment,
      tournament: e.tournament,
      bulletPenalty: e.bulletPenalty,
    },
    rawStats: {
      rapidClassicalGames: (e.snapshot?.rapidGames ?? 0) + (e.snapshot?.classicalGames ?? 0),
      blitzGames: e.snapshot?.blitzGames ?? 0,
      puzzleSolved: e.snapshot?.puzzleSolved ?? 0,
      winRate: (e.snapshot?.rapidGames ?? 0) + (e.snapshot?.blitzGames ?? 0) > 0 
        ? ((e.snapshot?.rapidWins ?? 0) + (e.snapshot?.blitzWins ?? 0)) / ((e.snapshot?.rapidGames ?? 0) + (e.snapshot?.blitzGames ?? 0)) 
        : 0,
      puzzleAccuracy: e.snapshot?.puzzleAttempts && e.snapshot.puzzleAttempts > 0 
        ? e.snapshot.puzzleSolved / e.snapshot.puzzleAttempts 
        : 0,
      ratingStart: e.snapshot?.rapidRatingStart ?? 0,
      ratingEnd: e.snapshot?.rapidRatingEnd ?? 0,
      streakDays: e.snapshot?.streakDays ?? 0,
    }
  }));

  const calculatedAt = dbEntries[0]?.calculatedAt ?? null;

  // ── Cache result ──────────────────────────────────────────────────────────
  await redisSet(
    cacheKey,
    { entries, calculatedAt: calculatedAt?.toISOString() ?? null, puzzleSolverAward },
    LEADERBOARD_CONFIG.CACHE_TTL_SECONDS
  );

  return { entries, calculatedAt, puzzleSolverAward };
}

/** Get a single student's leaderboard entry (detailed breakdown) */
export async function getStudentLeaderboardEntry(
  studentProfileId: string,
  periodType: 'WEEKLY' | 'MONTHLY',
  periodStart?: string
) {
  const user = await getCurrentUser();

  // Students can only view their own data
  if (user.role === Role.STUDENT) {
    const myProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (myProfile?.id !== studentProfileId) {
      return { entry: null, error: 'Unauthorized' };
    }
  }

  const period = getCurrentPeriod(periodType);
  const start = periodStart ? new Date(periodStart) : period.periodStart;

  const scoreKey = REDIS_KEYS.studentScore(studentProfileId, periodType, start.toISOString());
  const cached = await redisGet<LeaderboardRow>(scoreKey);
  if (cached) return { entry: cached };

  const entry = await prisma.leaderboardEntry.findUnique({
    where: {
      studentProfileId_periodType_periodStart: {
        studentProfileId,
        periodType,
        periodStart: start,
      },
    },
    include: {
      student: {
        include: {
          user: { select: { name: true, profilePictureUrl: true } },
          chessAccount: { select: { chessComUsername: true, lichessUsername: true } },
          activitySnapshots: {
            where: { periodType, periodStart: start },
            take: 1,
          },
        },
      },
    },
  });

  if (!entry) return { entry: null };

  const row: LeaderboardRow = {
    rank: entry.rank ?? 999,
    studentProfileId: entry.studentProfileId,
    studentName: entry.student.user.name,
    profilePictureUrl: entry.student.user.profilePictureUrl,
    totalScore: entry.totalScore,
    chessComUsername: entry.student.chessAccount?.chessComUsername ?? null,
    lichessUsername: entry.student.chessAccount?.lichessUsername ?? null,
    isDisqualified: entry.isDisqualified,
    isDataStale: false,    // not checked in student view
    ccFetchFailed: false,
    liFetchFailed: false,
    breakdown: {
      rapidClassicalPoints: entry.rapidClassicalPoints,
      blitzPoints: entry.blitzPoints,
      puzzlePoints: entry.puzzlePoints,
      winRateBonus: entry.winRateBonus,
      puzzleAccuracyBonus: entry.puzzleAccuracyBonus,
      ratingBonus: entry.ratingBonus,
      consistencyBonus: entry.consistencyBonus,
      coachFeedback: entry.coachFeedback,
      attendance: entry.attendance,
      assignment: entry.assignment,
      tournament: entry.tournament,
      bulletPenalty: entry.bulletPenalty,
    },
    rawStats: {
      rapidClassicalGames: (entry.student.activitySnapshots[0]?.rapidGames ?? 0) + (entry.student.activitySnapshots[0]?.classicalGames ?? 0),
      blitzGames: entry.student.activitySnapshots[0]?.blitzGames ?? 0,
      puzzleSolved: entry.student.activitySnapshots[0]?.puzzleSolved ?? 0,
      winRate: (entry.student.activitySnapshots[0]?.rapidGames ?? 0) + (entry.student.activitySnapshots[0]?.blitzGames ?? 0) > 0 
        ? ((entry.student.activitySnapshots[0]?.rapidWins ?? 0) + (entry.student.activitySnapshots[0]?.blitzWins ?? 0)) / ((entry.student.activitySnapshots[0]?.rapidGames ?? 0) + (entry.student.activitySnapshots[0]?.blitzGames ?? 0)) 
        : 0,
      puzzleAccuracy: entry.student.activitySnapshots[0]?.puzzleAttempts && entry.student.activitySnapshots[0].puzzleAttempts > 0 
        ? entry.student.activitySnapshots[0].puzzleSolved / entry.student.activitySnapshots[0].puzzleAttempts 
        : 0,
      ratingStart: entry.student.activitySnapshots[0]?.rapidRatingStart ?? 0,
      ratingEnd: entry.student.activitySnapshots[0]?.rapidRatingEnd ?? 0,
      streakDays: entry.student.activitySnapshots[0]?.streakDays ?? 0,
    }
  };

  await redisSet(scoreKey, row, LEADERBOARD_CONFIG.CACHE_TTL_SECONDS);
  return { entry: row };
}

/** Get available periods (for period picker dropdown) */
export async function getLeaderboardPeriods(periodType: 'WEEKLY' | 'MONTHLY') {
  await getCurrentUser();

  const periods = await prisma.leaderboardEntry.findMany({
    where: { periodType },
    distinct: ['periodStart'],
    orderBy: { periodStart: 'desc' },
    take: 12,
    select: { periodStart: true, periodType: true },
  });

  return periods.map((p) => ({
    periodStart: p.periodStart.toISOString(),
    periodType: p.periodType,
    label:
      periodType === 'WEEKLY'
        ? `Week of ${p.periodStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : p.periodStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  }));
}

/** Admin: disqualify a student from the leaderboard for a period */
export async function disqualifyStudent(
  studentProfileId: string,
  periodType: 'WEEKLY' | 'MONTHLY',
  periodStart: string,
  reason: 'EXCESSIVE_BULLET_GAMES' | 'FAIR_PLAY_VIOLATION' | 'SUSPICIOUS_ACTIVITY' | 'INCOMPLETE_DATA'
) {
  const user = await getCurrentUser();
  if (user.role !== Role.ADMIN) return { success: false, error: 'Unauthorized' };

  await prisma.leaderboardEntry.update({
    where: {
      studentProfileId_periodType_periodStart: {
        studentProfileId,
        periodType,
        periodStart: new Date(periodStart),
      },
    },
    data: {
      isDisqualified: true,
      disqualifiedReason: reason,
      disqualifiedAt: new Date(),
      rank: null,
    },
  });

  // Invalidate cache
  const cacheKey = REDIS_KEYS.leaderboard(periodType, periodStart);
  const top10Key = REDIS_KEYS.top10(periodType, periodStart);
  const scoreKey = REDIS_KEYS.studentScore(studentProfileId, periodType, periodStart);
  await Promise.all([
    prisma // Re-rank after disqualification
      .$queryRaw`SELECT 1`, // placeholder — actual re-rank happens via worker
    import('@/lib/redis').then(({ redis: r }) => r.del(cacheKey, top10Key, scoreKey)),
  ]);

  return { success: true };
}

/** Coach: submit monthly feedback for a student */
export async function submitCoachFeedback(input: {
  studentProfileId: string;
  periodType: 'WEEKLY' | 'MONTHLY';
  periodStart: string;
  engagement: number;
  behaviour: number;
  conceptAdoption: number;
  joiningOnTime: number;
  cameraOn: number;
  remarks?: string;
}) {
  const user = await getCurrentUser();
  if (user.role !== Role.TEACHER && user.role !== Role.ADMIN) {
    return { success: false, error: 'Unauthorized' };
  }

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!coachProfile && user.role !== Role.ADMIN) {
    return { success: false, error: 'Coach profile not found' };
  }

  // Validate 0-10 range
  const fields = ['engagement', 'behaviour', 'conceptAdoption', 'joiningOnTime', 'cameraOn'] as const;
  for (const field of fields) {
    const val = input[field];
    if (val < 0 || val > 10) return { success: false, error: `${field} must be between 0 and 10` };
  }

  await prisma.coachFeedback.upsert({
    where: {
      studentProfileId_coachId_periodType_periodStart: {
        studentProfileId: input.studentProfileId,
        coachId: coachProfile?.id ?? 'admin',
        periodType: input.periodType,
        periodStart: new Date(input.periodStart),
      },
    },
    create: {
      studentProfileId: input.studentProfileId,
      coachId: coachProfile?.id ?? 'admin',
      periodType: input.periodType,
      periodStart: new Date(input.periodStart),
      engagement: input.engagement,
      behaviour: input.behaviour,
      conceptAdoption: input.conceptAdoption,
      joiningOnTime: input.joiningOnTime,
      cameraOn: input.cameraOn,
      remarks: input.remarks,
    },
    update: {
      engagement: input.engagement,
      behaviour: input.behaviour,
      conceptAdoption: input.conceptAdoption,
      joiningOnTime: input.joiningOnTime,
      cameraOn: input.cameraOn,
      remarks: input.remarks,
    },
  });

  return { success: true };
}

/** Coach: award tournament score for a student */
export async function submitTournamentScore(input: {
  studentProfileId: string;
  periodType: 'WEEKLY' | 'MONTHLY';
  periodStart: string;
  tournamentDate: string;
  score: number;
  notes?: string;
}) {
  const user = await getCurrentUser();
  if (user.role !== Role.TEACHER && user.role !== Role.ADMIN) {
    return { success: false, error: 'Unauthorized' };
  }

  if (input.score < 0 || input.score > 100) {
    return { success: false, error: 'Tournament score must be 0–100' };
  }

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  await prisma.tournamentScore.create({
    data: {
      studentProfileId: input.studentProfileId,
      coachId: coachProfile?.id ?? 'admin',
      periodType: input.periodType,
      periodStart: new Date(input.periodStart),
      tournamentDate: new Date(input.tournamentDate),
      score: input.score,
      notes: input.notes,
    },
  });

  return { success: true };
}

/** Get coach feedback already submitted for a student in a period */
export async function getCoachFeedback(
  studentProfileId: string,
  periodType: 'WEEKLY' | 'MONTHLY',
  periodStart: string
) {
  const user = await getCurrentUser();
  if (user.role !== Role.TEACHER && user.role !== Role.ADMIN) {
    return null;
  }

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return prisma.coachFeedback.findFirst({
    where: {
      studentProfileId,
      ...(coachProfile ? { coachId: coachProfile.id } : {}),
      periodType,
      periodStart: new Date(periodStart),
    },
  });
}

/** Student: Get their own coach feedback for a period */
export async function getStudentCoachFeedback(
  periodType: 'WEEKLY' | 'MONTHLY',
  periodStart: string
) {
  const user = await getCurrentUser();
  if (user.role !== Role.STUDENT) return null;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  
  if (!profile) return null;

  return prisma.coachFeedback.findFirst({
    where: {
      studentProfileId: profile.id,
      periodType,
      periodStart: new Date(periodStart),
    },
    include: {
      coach: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });
}
