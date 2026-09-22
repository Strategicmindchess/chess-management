import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { getLeaderboard, getStudentCoachFeedback } from "@/actions/leaderboard/leaderboard-actions";
import { getMyRefreshStatus } from "@/actions/leaderboard/fetch-actions";
import { getCurrentPeriod } from "@/lib/leaderboard-period";
import { withLogging } from "../../../../lib/api-logger";

export const dynamic = "force-dynamic";
export let GET = withLogging(async function(req: NextRequest) {
    const user = await requireRole([Role.STUDENT]);

    try {
    const [studentProfile, monthlyData, weeklyData, refreshStatus, coachFeedback] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId: user.id },
        include: {
          chessAccount: true,
          leaderboardEntries: {
            orderBy: { periodStart: 'desc' },
            take: 1,
          },
        },
      }),
      getLeaderboard('MONTHLY'),
      getLeaderboard('WEEKLY'),
      getMyRefreshStatus(),
      getStudentCoachFeedback('MONTHLY', getCurrentPeriod('MONTHLY').periodStart.toISOString())
    ]);

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const chessAccount = studentProfile.chessAccount;
    const hasLinkedAccounts = !!(chessAccount?.chessComUsername || chessAccount?.lichessUsername);

    const puzzleSolverAward = monthlyData.puzzleSolverAward;

    return NextResponse.json({
      hasLinkedAccounts,
      chessAccount,
      studentProfile,
      monthlyData,
      weeklyData,
      refreshStatus,
      coachFeedback,
      puzzleSolverAward,
    });
    } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch student leaderboard" },
      { status: 500 }
    );
    }
    });
