import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { withLogging } from "../../../../lib/api-logger";

export const dynamic = "force-dynamic";

// ─── GET /api/teacher/coach-leaderboard ───────────────────────────────────────
// Teacher views their own coach leaderboard score for a month.
// Query param: ?month=2026-09 (defaults to current month)
export let GET = withLogging(async function(req: NextRequest) {
    let user: Awaited<ReturnType<typeof requireRole>>;
    try {
    user = await requireRole([Role.TEACHER]);
    } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = searchParams.get("month") || defaultMonth;

    // Get teacher's coach profile
    const coach = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
    });

    if (!coach) {
    return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
    }

    const entry = await prisma.coachLeaderboardEntry.findUnique({
    where: { coachProfileId_month: { coachProfileId: coach.id, month } },
    });

    // Also get rank among all coaches for context
    const rankInfo = entry
    ? await prisma.coachLeaderboardEntry.count({
        where: { month, totalScore: { gt: entry.totalScore } },
      })
    : null;

    return NextResponse.json({
    entry: entry
      ? {
          month: entry.month,
          studentPerfScore: entry.studentPerfScore,
          studentFeedScore: entry.studentFeedScore,
          classQualityScore: entry.classQualityScore,
          managementPoints: entry.managementPoints,
          managementNote: entry.managementNote,
          managementAwardedAt: entry.managementAwardedAt,
          totalScore: entry.totalScore,
          rank: rankInfo !== null ? rankInfo + 1 : null,
          totalClassesWithFeedback: entry.totalClassesWithFeedback,
          totalFeedbackCount: entry.totalFeedbackCount,
          calculatedAt: entry.calculatedAt,
        }
      : null,
    month,
    });
    });
