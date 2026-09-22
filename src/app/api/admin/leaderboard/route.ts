import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/actions/leaderboard/leaderboard-actions";
import { getCurrentPeriod } from "@/lib/leaderboard-period";
import { getAllStudentsWithChessStatus } from "@/actions/leaderboard/account-actions";
import { withLogging } from "../../../../lib/api-logger";

export const dynamic = "force-dynamic";
export let GET = withLogging(async function(req: NextRequest) {
    await requireRole([Role.ADMIN]);

    try {
    const { searchParams } = new URL(req.url);
    const periodType = searchParams.get("period") === "WEEKLY" ? "WEEKLY" : "MONTHLY";

    const [leaderboardData, calcLog, linkedCount, totalStudents, studentsWithStatus] = await Promise.all([
      getLeaderboard(periodType),
      prisma.leaderboardCalculationLog.findFirst({
        where: { periodType: periodType },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.chessAccount.count({
        where: {
          OR: [
            { chessComUsername: { not: null } },
            { lichessUsername: { not: null } },
          ],
        },
      }),
      prisma.user.count({ where: { role: Role.STUDENT, isActive: true } }),
      getAllStudentsWithChessStatus(),
    ]);

    const { periodStart: pStartObj } = getCurrentPeriod(periodType);
    const periodStart = pStartObj.toISOString();

    return NextResponse.json({
      leaderboardData,
      calcLog,
      linkedCount,
      totalStudents,
      studentsWithStatus,
      periodStart,
    });
    } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch admin leaderboard" },
      { status: 500 }
    );
    }
    });
