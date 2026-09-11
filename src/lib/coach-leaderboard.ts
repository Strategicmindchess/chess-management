/**
 * Coach Leaderboard Calculation Library
 *
 * Calculates 400 auto-points from ClassFeedback for a given coach and month.
 * The 100 Management Points are awarded separately by admin via the API.
 *
 * Scoring breakdown (400 pts auto):
 *   Student Performance  = avg(overallCoachScore) / 10 × 100  [0–100]
 *   Student Feedback     = avg(classQualityScore)  / 10 × 200  [0–200]
 *   Class Quality        = avg(classQualityScore)  / 10 × 100  [0–100]
 *
 * Note: Student Feedback (200) and Class Quality (100) both use classQualityScore
 * but with different multipliers — the higher weight on Student Feedback reflects
 * the volume + quality of feedback received across all classes.
 */

import { prisma } from "@/lib/prisma";

export interface CoachMonthScores {
  coachProfileId: string;
  month: string;
  studentPerfScore: number;   // 0–100
  studentFeedScore: number;   // 0–200
  classQualityScore: number;  // 0–100
  totalClassesWithFeedback: number;
  totalFeedbackCount: number;
}

/**
 * Calculate the auto-scored 400 points for a single coach for a given month.
 * Month format: "2026-09"
 */
export async function calculateCoachAutoScore(
  coachProfileId: string,
  month: string
): Promise<CoachMonthScores> {
  // Build date range for the month
  const [year, monthNum] = month.split("-").map(Number);
  const periodStart = new Date(year, monthNum - 1, 1);
  const periodEnd = new Date(year, monthNum, 1); // exclusive upper bound

  // Fetch all ClassFeedback for classes taught by this coach this month
  const feedbacks = await prisma.classFeedback.findMany({
    where: {
      classLog: {
        coachProfileId,
        date: { gte: periodStart, lt: periodEnd },
      },
      // Only count feedbacks with scores filled
      OR: [
        { overallCoachScore: { not: null } },
        { classQualityScore: { not: null } },
      ],
    },
    select: {
      overallCoachScore: true,
      classQualityScore: true,
      classLogId: true,
    },
  });

  const totalFeedbackCount = feedbacks.length;
  const uniqueClassLogs = new Set(feedbacks.map((f) => f.classLogId));
  const totalClassesWithFeedback = uniqueClassLogs.size;

  if (totalFeedbackCount === 0) {
    return {
      coachProfileId,
      month,
      studentPerfScore: 0,
      studentFeedScore: 0,
      classQualityScore: 0,
      totalClassesWithFeedback: 0,
      totalFeedbackCount: 0,
    };
  }

  // Average overallCoachScore (student rates coach out of 10)
  const overallScores = feedbacks
    .filter((f) => f.overallCoachScore !== null)
    .map((f) => f.overallCoachScore as number);

  const avgOverall =
    overallScores.length > 0
      ? overallScores.reduce((sum, s) => sum + s, 0) / overallScores.length
      : 0;

  // Average classQualityScore (class quality out of 10)
  const qualityScores = feedbacks
    .filter((f) => f.classQualityScore !== null)
    .map((f) => f.classQualityScore as number);

  const avgQuality =
    qualityScores.length > 0
      ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length
      : 0;

  // Score calculations
  const studentPerfScore = Math.round((avgOverall / 10) * 100);  // 0–100
  const studentFeedScore = Math.round((avgQuality / 10) * 200);  // 0–200
  const classQualityScore = Math.round((avgQuality / 10) * 100); // 0–100

  return {
    coachProfileId,
    month,
    studentPerfScore: Math.min(100, studentPerfScore),
    studentFeedScore: Math.min(200, studentFeedScore),
    classQualityScore: Math.min(100, classQualityScore),
    totalClassesWithFeedback,
    totalFeedbackCount,
  };
}

/**
 * Calculate and upsert CoachLeaderboardEntry for one coach for a month.
 * Preserves existing managementPoints if already awarded by admin.
 */
export async function upsertCoachLeaderboardEntry(
  coachProfileId: string,
  month: string
) {
  const scores = await calculateCoachAutoScore(coachProfileId, month);

  // Fetch existing entry to preserve manual management points
  const existing = await prisma.coachLeaderboardEntry.findUnique({
    where: { coachProfileId_month: { coachProfileId, month } },
    select: { managementPoints: true, managementNote: true, managementAwardedAt: true, managementAwardedById: true },
  });

  const managementPoints = existing?.managementPoints ?? 0;
  const totalScore =
    scores.studentPerfScore +
    scores.studentFeedScore +
    scores.classQualityScore +
    managementPoints;

  return prisma.coachLeaderboardEntry.upsert({
    where: { coachProfileId_month: { coachProfileId, month } },
    create: {
      coachProfileId,
      month,
      studentPerfScore: scores.studentPerfScore,
      studentFeedScore: scores.studentFeedScore,
      classQualityScore: scores.classQualityScore,
      totalClassesWithFeedback: scores.totalClassesWithFeedback,
      totalFeedbackCount: scores.totalFeedbackCount,
      managementPoints: 0,
      totalScore,
    },
    update: {
      studentPerfScore: scores.studentPerfScore,
      studentFeedScore: scores.studentFeedScore,
      classQualityScore: scores.classQualityScore,
      totalClassesWithFeedback: scores.totalClassesWithFeedback,
      totalFeedbackCount: scores.totalFeedbackCount,
      totalScore,
    },
  });
}

/**
 * Calculate leaderboard for ALL coaches for a month and assign ranks.
 */
export async function calculateAllCoachLeaderboard(month: string) {
  const coaches = await prisma.coachProfile.findMany({
    where: { user: { isActive: true } },
    select: { id: true },
  });

  // Calculate all in parallel
  await Promise.all(
    coaches.map((c) => upsertCoachLeaderboardEntry(c.id, month))
  );

  // Assign ranks ordered by totalScore desc
  const entries = await prisma.coachLeaderboardEntry.findMany({
    where: { month },
    orderBy: [{ totalScore: "desc" }, { coachProfileId: "asc" }],
    select: { id: true },
  });

  await Promise.all(
    entries.map((entry, idx) =>
      prisma.coachLeaderboardEntry.update({
        where: { id: entry.id },
        data: { rank: idx + 1 },
      })
    )
  );

  return entries.length;
}

