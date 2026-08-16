import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';
import { redis, redisDel } from '../src/lib/redis';
import { REDIS_KEYS, POINTS } from '../src/lib/leaderboard-config';

function calcRapidClassicalPoints(rapidGames: number, classicalGames: number): number {
  const total = Math.min(rapidGames + classicalGames, POINTS.RAPID_CLASSICAL_MAX_GAMES);
  return Math.min(total * POINTS.RAPID_CLASSICAL_PER_GAME, POINTS.RAPID_CLASSICAL_MAX_POINTS);
}

function calcBlitzPoints(blitzGames: number): number {
  return Math.min(blitzGames, POINTS.BLITZ_MAX_GAMES) * POINTS.BLITZ_PER_GAME;
}

function calcPuzzlePoints(puzzleSolved: number): number {
  const counted = Math.min(puzzleSolved, POINTS.PUZZLE_MAX_SOLVES);
  return counted * POINTS.PUZZLE_PER_SOLVE;
}

function calcWinRateBonus(
  rapidGames: number, rapidWins: number,
  blitzGames: number, blitzWins: number
): number {
  const totalGames = rapidGames + blitzGames;
  if (totalGames < 10) return 0;
  const winRate = (rapidWins + blitzWins) / totalGames;
  return winRate >= 0.5 ? POINTS.WIN_RATE_BONUS_HIGH : POINTS.WIN_RATE_PENALTY_LOW;
}

function calcPuzzleAccuracyBonus(puzzleAttempts: number, puzzleSolved: number): number {
  if (puzzleAttempts < 20) return 0;
  const rate = puzzleSolved / puzzleAttempts;
  return rate >= 0.7 ? POINTS.PUZZLE_ACCURACY_BONUS_HIGH : POINTS.PUZZLE_ACCURACY_PENALTY_LOW;
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

async function main() {
  const periodType = 'MONTHLY';
  const period = getCurrentPeriod(periodType);
  const { periodStart, periodEnd } = period;

  console.log(`Syncing LeaderboardEntry table in database for ${periodType} starting ${periodStart.toISOString()}...`);

  // 1. Fetch all active students
  const allActiveStudents = await prisma.studentProfile.findMany({
    where: {
      user: { isActive: true, role: 'STUDENT' },
    },
    include: { user: { select: { id: true, name: true } } },
  });

  const studentIds = allActiveStudents.map((s) => s.id);

  // 2. Fetch snapshots
  const snapshots = await prisma.chessActivitySnapshot.findMany({
    where: { periodType, periodStart },
  });
  const snapshotMap = new Map(snapshots.map((s) => [s.studentProfileId, s]));

  // 3. Fetch manual scores
  const [feedbacks, attendances, assignments, tournaments, allChessStats] = await Promise.all([
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
    prisma.studentChessStats.findMany({
      where: { studentProfileId: { in: studentIds } },
      select: { studentProfileId: true, ccStreak: true, liStreak: true },
    }),
  ]);

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
  const tournamentMap = new Map<string, number>();
  for (const t of tournaments) {
    tournamentMap.set(
      t.studentProfileId,
      Math.min((tournamentMap.get(t.studentProfileId) ?? 0) + t.score, POINTS.TOURNAMENT_MAX)
    );
  }
  const chessStatsMap = new Map(allChessStats.map((s) => [s.studentProfileId, s]));

  // 4. Calculate entries
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

  for (const student of allActiveStudents) {
    const sid = student.id;
    let snap = snapshotMap.get(sid) ?? null;

    // If student has no snapshot, create an empty one so snapshotId is guaranteed
    if (!snap) {
      snap = await prisma.chessActivitySnapshot.upsert({
        where: {
          studentProfileId_periodType_periodStart: {
            studentProfileId: sid,
            periodType,
            periodStart,
          },
        },
        create: {
          studentProfileId: sid,
          periodType,
          periodStart,
          periodEnd,
          rapidGames: 0, blitzGames: 0, classicalGames: 0, bulletGames: 0, ultraBulletGames: 0,
          rapidWins: 0, blitzWins: 0, classicalWins: 0, puzzleAttempts: 0, puzzleSolved: 0,
          streakDays: 0,
        },
        update: {},
      });
    }

    const rapidClassicalPoints = calcRapidClassicalPoints(snap.rapidGames, snap.classicalGames);
    const blitzPoints = calcBlitzPoints(snap.blitzGames);
    const puzzlePoints = calcPuzzlePoints(snap.puzzleSolved);
    const winRateBonus = calcWinRateBonus(snap.rapidGames, snap.rapidWins, snap.blitzGames, snap.blitzWins);
    const puzzleAccuracyBonus = calcPuzzleAccuracyBonus(snap.puzzleAttempts, snap.puzzleSolved);
    const ratingBonus = calcRatingBonus(snap.rapidRatingStart, snap.rapidRatingEnd);

    const chessStats = chessStatsMap.get(sid);
    const liveStreak = Math.max(chessStats?.ccStreak ?? 0, chessStats?.liStreak ?? 0);
    const consistencyBonus = calcConsistencyBonus(liveStreak);

    const bulletPenalty = calcBulletPenalty(snap.bulletGames, snap.ultraBulletGames);

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
      snapshotId: snap.id,
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

  // 5. Sort & assign ranks
  entries.sort((a, b) => b.totalScore - a.totalScore);

  let currentRank = 1;
  let previousScore = -1;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
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

  // 6. Invalidate Redis cache
  const periodStartStr = periodStart.toISOString();
  const cacheKey = REDIS_KEYS.leaderboard(periodType, periodStartStr);
  const top10Key = REDIS_KEYS.top10(periodType, periodStartStr);
  await redis.del(cacheKey, top10Key);

  for (const entry of entries) {
    const scoreKey = REDIS_KEYS.studentScore(entry.studentProfileId, periodType, periodStartStr);
    await redisDel(scoreKey);
  }

  console.log(`Successfully synced ${entries.length} students to LeaderboardEntry DB table and invalidated Redis cache!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
