/**
 * Leaderboard Calculation Worker — Worker 2
 *
 * Responsibilities:
 *  1. Read ChessActivitySnapshot from DB for the given period
 *  2. Read manual scores: CoachFeedback, LeaderboardAttendance, AssignmentScore, TournamentScore
 *  3. Calculate score for each student using the 1000-pt point system
 *  4. Save/update LeaderboardEntry in DB
 *  5. Assign ranks (ordered by totalScore DESC)
 *  6. Invalidate Redis cache so UI reads fresh data
 *
 * Completely separate from chess-fetch.worker.ts.
 * Triggered by: cron, webhook, admin action.
 */

import { Worker, type Job } from 'bullmq';
import { connection } from '@/workers/queue';
import { QUEUE_NAMES, POINTS, REDIS_KEYS, LEADERBOARD_CONFIG } from '@/lib/leaderboard-config';
import { prisma } from '@/lib/prisma';
import { redis, redisDel } from '@/lib/redis';
import type { LeaderboardCalcJobData } from './leaderboard.queues';
import { logger } from '@/lib/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Score calculation (pure functions)
// ──────────────────────────────────────────────────────────────────────────────

function calcRapidClassicalPoints(rapidGames: number, classicalGames: number): number {
  const total = Math.min(rapidGames + classicalGames, POINTS.RAPID_CLASSICAL_MAX_GAMES);
  return Math.min(total * POINTS.RAPID_CLASSICAL_PER_GAME, POINTS.RAPID_CLASSICAL_MAX_POINTS);
}

function calcBlitzPoints(blitzGames: number): number {
  return Math.min(blitzGames, POINTS.BLITZ_MAX_GAMES) * POINTS.BLITZ_PER_GAME;
}

function calcPuzzlePoints(puzzleSolved: number): number {
  const counted = Math.min(puzzleSolved, POINTS.PUZZLE_MAX_SOLVES);
  // Use * 0.5 (not Math.floor) to preserve fractional points, matching report script
  return counted * POINTS.PUZZLE_PER_SOLVE;
}

function calcWinRateBonus(
  rapidGames: number, rapidWins: number,
  blitzGames: number, blitzWins: number
): number {
  const totalGames = rapidGames + blitzGames;
  if (totalGames < 10) return 0; // need at least 10 games
  const winRate = (rapidWins + blitzWins) / totalGames;
  // >= 50% gets bonus, < 50% gets penalty (50% exactly should be rewarded)
  return winRate >= 0.5 ? POINTS.WIN_RATE_BONUS_HIGH : POINTS.WIN_RATE_PENALTY_LOW;
}

function calcPuzzleAccuracyBonus(puzzleAttempts: number, puzzleSolved: number): number {
  if (puzzleAttempts === 0) return 0;
  const rate = puzzleSolved / puzzleAttempts;
  return rate > 0.7 ? POINTS.PUZZLE_ACCURACY_BONUS_HIGH : POINTS.PUZZLE_ACCURACY_PENALTY_LOW;
}

function calcRatingBonus(rapidRatingStart: number | null, rapidRatingEnd: number | null): number {
  if (!rapidRatingStart || !rapidRatingEnd) return 0;
  const gain = rapidRatingEnd - rapidRatingStart;
  if (gain <= 0) return 0;
  const bonus = Math.floor(gain / 50) * POINTS.RATING_BONUS_PER_50;
  return Math.min(bonus, POINTS.RATING_BONUS_MAX);
}

function calcConsistencyBonus(streakDays: number): number {
  if (streakDays >= 30) return POINTS.STREAK_30;
  if (streakDays >= 21) return POINTS.STREAK_21;
  if (streakDays >= 14) return POINTS.STREAK_14;
  if (streakDays >= 7) return POINTS.STREAK_7;
  return 0;
}

function calcBulletPenalty(bulletGames: number, ultraBulletGames: number): number {
  return (bulletGames + ultraBulletGames) > POINTS.BULLET_THRESHOLD ? POINTS.BULLET_PENALTY : 0;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main job processor
// ──────────────────────────────────────────────────────────────────────────────

export async function processLeaderboardCalc(job: Job<LeaderboardCalcJobData>) {
  const { periodType, periodStart: periodStartStr, periodEnd: periodEndStr, studentProfileId } = job.data;
  const periodStart = new Date(periodStartStr);
  const periodEnd = new Date(periodEndStr);

  console.log(`[LeaderboardCalcWorker] Calculating ${periodType} leaderboard for period ${periodStartStr}`);

  // ── Log start ──────────────────────────────────────────────────────────────
  await prisma.leaderboardCalculationLog.upsert({
    where: { periodType_periodStart: { periodType, periodStart } },
    create: {
      periodType,
      periodStart,
      totalStudents: 0,
      calculatedCount: 0,
      disqualifiedCount: 0,
    },
    update: { startedAt: new Date() },
  });

  // ── Fetch all active students ──────────────────────────────────────────────
  const allActiveStudents = await prisma.studentProfile.findMany({
    where: {
      ...(studentProfileId ? { id: studentProfileId } : {}),
      user: { isActive: true, role: 'STUDENT' },
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // ── Fetch snapshots (students with chess accounts & data) ──────────────────
  const snapshotWhere: any = {
    periodType,
    periodStart,
    ...(studentProfileId ? { studentProfileId } : {}),
  };

  const snapshots = await prisma.chessActivitySnapshot.findMany({
    where: snapshotWhere,
    include: { student: { include: { user: true } } },
  });
  const snapshotMap = new Map(snapshots.map((s) => [s.studentProfileId, s]));

  await job.updateProgress(10);

  // ── Fetch manual scores for ALL active students ───────────────────────────
  const studentIds = allActiveStudents.map((s) => s.id);

  const [feedbacks, attendances, assignments, tournaments] = await Promise.all([
    prisma.coachFeedback.findMany({
      where: { periodType, periodStart, studentProfileId: { in: studentIds } },
    }),
    prisma.leaderboardAttendance.findMany({
      where: { periodType, periodStart, studentProfileId: { in: studentIds } },
    }),
    prisma.assignmentScore.findMany({
      where: { periodType, periodStart, studentProfileId: { in: studentIds } },
    }),
    prisma.tournamentScore.findMany({
      where: { periodType, periodStart, studentProfileId: { in: studentIds } },
    }),
  ]);

  // Index manual scores by studentProfileId
  const feedbackMap = new Map(feedbacks.map((f) => [
    f.studentProfileId,
    Math.min(f.engagement + f.behaviour + f.conceptAdoption + f.joiningOnTime + f.cameraOn, POINTS.COACH_FEEDBACK_MAX),
  ]));
  const attendanceMap = new Map(attendances.map((a) => [
    a.studentProfileId,
    a.attendancePercent >= 75 ? POINTS.ATTENDANCE_MAX : 0,
  ]));
  const assignmentMap = new Map(assignments.map((a) => [
    a.studentProfileId,
    Math.min(a.score, POINTS.ASSIGNMENT_MAX),
  ]));
  // Sum tournament scores per student (could be multiple entries per period)
  const tournamentMap = new Map<string, number>();
  for (const t of tournaments) {
    tournamentMap.set(
      t.studentProfileId,
      Math.min((tournamentMap.get(t.studentProfileId) ?? 0) + t.score, POINTS.TOURNAMENT_MAX)
    );
  }

  await job.updateProgress(30);

  // ── Calculate scores ───────────────────────────────────────────────────────
  const entries: Array<{
    studentProfileId: string;
    snapshotId: string;
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
    totalScore: number;
  }> = [];

  // Pre-fetch all chess stats in one query for efficiency
  const allChessStats = await prisma.studentChessStats.findMany({
    where: { studentProfileId: { in: studentIds } },
    select: { studentProfileId: true, ccStreak: true, liStreak: true },
  });
  const chessStatsMap = new Map(allChessStats.map((s) => [s.studentProfileId, s]));

  for (const student of allActiveStudents) {
    const sid = student.id;
    const snap = snapshotMap.get(sid) ?? null;

    // Chess scores: 0 if no snapshot
    const rapidClassicalPoints = snap ? calcRapidClassicalPoints(snap.rapidGames, snap.classicalGames) : 0;
    const blitzPoints = snap ? calcBlitzPoints(snap.blitzGames) : 0;
    const puzzlePoints = snap ? calcPuzzlePoints(snap.puzzleSolved) : 0;
    const winRateBonus = snap ? calcWinRateBonus(snap.rapidGames, snap.rapidWins, snap.blitzGames, snap.blitzWins) : 0;
    const puzzleAccuracyBonus = snap ? calcPuzzleAccuracyBonus(snap.puzzleAttempts, snap.puzzleSolved) : 0;
    const ratingBonus = snap ? calcRatingBonus(snap.rapidRatingStart, snap.rapidRatingEnd) : 0;

    // Streak: max of CC and Lichess streaks from StudentChessStats
    const chessStats = chessStatsMap.get(sid);
    const liveStreak = Math.max(chessStats?.ccStreak ?? 0, chessStats?.liStreak ?? 0);
    const consistencyBonus = calcConsistencyBonus(liveStreak);

    const bulletPenalty = snap ? calcBulletPenalty(snap.bulletGames, snap.ultraBulletGames) : 0;

    const coachFeedback = feedbackMap.get(sid) ?? 0;
    const attendance = attendanceMap.get(sid) ?? 0;
    const assignment = assignmentMap.get(sid) ?? 0;
    const tournament = tournamentMap.get(sid) ?? 0;

    const raw =
      rapidClassicalPoints + blitzPoints + puzzlePoints +
      winRateBonus + puzzleAccuracyBonus + ratingBonus + consistencyBonus +
      coachFeedback + attendance + assignment + tournament +
      bulletPenalty;

    const totalScore = Math.max(0, Math.min(raw, POINTS.TOTAL_MAX));

    entries.push({
      studentProfileId: sid,
      snapshotId: snap?.id ?? '',
      rapidClassicalPoints,
      blitzPoints,
      puzzlePoints,
      winRateBonus,
      puzzleAccuracyBonus,
      ratingBonus,
      consistencyBonus,
      coachFeedback,
      attendance,
      assignment,
      tournament,
      bulletPenalty,
      totalScore,
    });
  }


  // ── Sort & assign ranks ───────────────────────────────────────────────────
  entries.sort((a, b) => b.totalScore - a.totalScore);
  
  let currentRank = 1;
  let previousScore = -1;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    // Standard Competition Ranking logic:
    // If the score is different from previous, update the rank to current index + 1
    if (entry.totalScore !== previousScore) {
      currentRank = i + 1;
    }
    previousScore = entry.totalScore;

    await prisma.leaderboardEntry.upsert({
      where: {
        studentProfileId_periodType_periodStart: {
          studentProfileId: entry.studentProfileId,
          periodType,
          periodStart,
        },
      },
      create: {
        studentProfileId: entry.studentProfileId,
        snapshotId: entry.snapshotId,
        periodType,
        periodStart,
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
        totalScore: entry.totalScore,
        rank: currentRank,
        calculatedAt: new Date(),
      },
      update: {
        snapshotId: entry.snapshotId,
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
        totalScore: entry.totalScore,
        rank: currentRank,
        calculatedAt: new Date(),
      },
    });
  }

  // ── Clean up obsolete entries ──────────────────────────────────────────────
  await prisma.leaderboardEntry.deleteMany({
    where: {
      periodType,
      periodStart,
      studentProfileId: { notIn: entries.map((e) => e.studentProfileId) },
    },
  });

  await job.updateProgress(80);

  // ── Detect Puzzle Solver Award ─────────────────────────────────────────────
  const topPuzzleSolver = snapshots.reduce(
    (best, s) => (s.puzzleSolved > (best?.puzzleSolved ?? 0) ? s : best),
    null as typeof snapshots[0] | null
  );

  if (topPuzzleSolver && topPuzzleSolver.puzzleSolved > 0) {
    await prisma.puzzleSolverAward.upsert({
      where: { periodType_periodStart: { periodType, periodStart } },
      create: {
        studentProfileId: topPuzzleSolver.studentProfileId,
        periodType,
        periodStart,
        totalPuzzlesSolved: topPuzzleSolver.puzzleSolved,
        awardAmount: 100,
      },
      update: {
        studentProfileId: topPuzzleSolver.studentProfileId,
        totalPuzzlesSolved: topPuzzleSolver.puzzleSolved,
      },
    });
  }

  await job.updateProgress(90);

  // ── Invalidate Redis cache ─────────────────────────────────────────────────
  const cacheKey = REDIS_KEYS.leaderboard(periodType, periodStartStr);
  const top10Key = REDIS_KEYS.top10(periodType, periodStartStr);
  await redis.del(cacheKey, top10Key);

  // Invalidate individual student score caches
  for (const entry of entries) {
    const scoreKey = REDIS_KEYS.studentScore(entry.studentProfileId, periodType, periodStartStr);
    await redisDel(scoreKey);
  }

  // ── Update calculation log ─────────────────────────────────────────────────
  await prisma.leaderboardCalculationLog.update({
    where: { periodType_periodStart: { periodType, periodStart } },
    data: {
      totalStudents: snapshots.length,
      calculatedCount: entries.length,
      completedAt: new Date(),
    },
  });

  await job.updateProgress(100);

  console.log(
    `[LeaderboardCalcWorker] Done. ${entries.length} students scored. ` +
    `Top score: ${entries[0]?.totalScore ?? 0}. Cache invalidated.`
  );

  return { calculatedCount: entries.length };
}

// ──────────────────────────────────────────────────────────────────────────────
// Worker instance
// ──────────────────────────────────────────────────────────────────────────────

export const leaderboardCalcWorker = new Worker<LeaderboardCalcJobData>(
  QUEUE_NAMES.LEADERBOARD_CALC,
  async (job) => {
    if (job.name === 'calc-leaderboard') {
      return processLeaderboardCalc(job);
    }
  },
  {
    connection,
    concurrency: 1, // Only one calculation at a time
  }
);

leaderboardCalcWorker.on('completed', (job, result) => {
  logger.job.success('leaderboard-calc', { jobId: job.id, calculatedCount: result?.calculatedCount });
});

leaderboardCalcWorker.on('failed', (job, err) => {
  logger.job.fail('leaderboard-calc', { jobId: job?.id, error: err.message });
});
