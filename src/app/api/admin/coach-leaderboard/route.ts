import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { calculateAllCoachLeaderboard } from "@/lib/coach-leaderboard";
import { withLogging } from "../../../../lib/api-logger";

export const dynamic = "force-dynamic";

// ─── GET /api/admin/coach-leaderboard ─────────────────────────────────────────
// List all coaches' leaderboard entries for a given month.
// Query param: ?month=2026-09 (defaults to current month)
// ─── POST /api/admin/coach-leaderboard ────────────────────────────────────────
// Trigger recalculation of auto scores for ALL coaches for a month.
export let GET = withLogging(async function(req: NextRequest) {
    try {
    await requireRole([Role.ADMIN, Role.TEACHER]);
    } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = searchParams.get("month") || defaultMonth;

    const entries = await prisma.coachLeaderboardEntry.findMany({
    where: { month },
    orderBy: [{ totalScore: "desc" }, { coachProfileId: "asc" }],
    include: {
      coach: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      managementAwardedBy: { select: { id: true, name: true } },
    },
    });

    // If no entries exist yet, return empty with coach list for triggering calc
    if (entries.length === 0) {
    const coaches = await prisma.coachProfile.findMany({
      where: { user: { isActive: true } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ entries: [], coaches, month });
    }

    return NextResponse.json({
    entries: entries.map((e, idx) => ({
      id: e.id,
      rank: e.rank ?? idx + 1,
      coachProfileId: e.coachProfileId,
      coachName: e.coach.user.name,
      coachEmail: e.coach.user.email,
      month: e.month,
      studentPerfScore: e.studentPerfScore,
      studentFeedScore: e.studentFeedScore,
      classQualityScore: e.classQualityScore,
      managementPoints: e.managementPoints,
      managementNote: e.managementNote,
      managementAwardedAt: e.managementAwardedAt,
      managementAwardedBy: e.managementAwardedBy?.name ?? null,
      totalScore: e.totalScore,
      totalClassesWithFeedback: e.totalClassesWithFeedback,
      totalFeedbackCount: e.totalFeedbackCount,
      calculatedAt: e.calculatedAt,
    })),
    month,
    });
    });
export let POST = withLogging(async function(req: NextRequest) {
    try {
    await requireRole([Role.ADMIN]);
    } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: { month?: string } = {};
    try {
    body = await req.json();
    } catch {}

    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = body.month || defaultMonth;

    const count = await calculateAllCoachLeaderboard(month);
    return NextResponse.json({ success: true, coachesCalculated: count, month });
    });
