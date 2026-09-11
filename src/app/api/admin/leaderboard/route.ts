import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/actions/leaderboard/leaderboard-actions";
import { getAllStudentsWithChessStatus } from "@/actions/leaderboard/account-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

    const now = new Date();
    const periodStart = periodType === 'MONTHLY' 
      ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      : (() => {
          const d = new Date();
          const dayOfWeek = d.getUTCDay();
          const diffToMonday = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          const ws = new Date(d.setUTCDate(diffToMonday));
          ws.setUTCHours(0, 0, 0, 0);
          return ws.toISOString();
        })();

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
}

