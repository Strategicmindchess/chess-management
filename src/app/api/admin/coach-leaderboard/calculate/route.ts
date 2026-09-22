import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { upsertCoachLeaderboardEntry } from "@/lib/coach-leaderboard";
import { prisma } from "@/lib/prisma";
import { withLogging } from "../../../../../lib/api-logger";

// ─── POST /api/admin/coach-leaderboard/calculate ──────────────────────────────
// Triggers auto-score recalculation for all active coaches for a given month.
export let POST = withLogging(async function(req: NextRequest) {
    try {
    await requireRole([Role.ADMIN]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: { month?: string; coachId?: string } = {};
    try {
    body = await req.json();
    } catch {}

    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = body.month || defaultMonth;

    if (body.coachId) {
    // Recalculate for a single coach
    const entry = await upsertCoachLeaderboardEntry(body.coachId, month);
    return NextResponse.json({ success: true, entry, month });
    }

    // Recalculate for ALL coaches
    const coaches = await prisma.coachProfile.findMany({
    where: { user: { isActive: true } },
    select: { id: true },
    });

    const results = await Promise.allSettled(
    coaches.map((c) => upsertCoachLeaderboardEntry(c.id, month))
    );

    // Assign ranks
    const entries = await prisma.coachLeaderboardEntry.findMany({
    where: { month },
    orderBy: { totalScore: "desc" },
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

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
    success: true,
    month,
    coachesCalculated: succeeded,
    failed,
    });
    });
