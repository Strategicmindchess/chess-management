import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/actions/leaderboard/leaderboard-actions";
import { getCurrentPeriod } from "@/lib/leaderboard-period";
import { withLogging } from "../../../../lib/api-logger";

export const dynamic = "force-dynamic";
export let GET = withLogging(async function(req: NextRequest) {
    const user = await requireRole([Role.TEACHER]);

    try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") === "WEEKLY" ? "WEEKLY" : "MONTHLY";

    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: user.id },
      include: {
        batches: {
          where: { isActive: true },
          include: {
            students: {
              include: {
                student: {
                  include: {
                    user: { select: { name: true } },
                    chessAccount: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!coachProfile) {
      return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
    }

    const myStudentIds = Array.from(new Set(
      coachProfile.batches.flatMap((b) => b.students.map((s) => s.studentProfileId))
    ));

    const myStudents = coachProfile.batches
      .flatMap((b) =>
        b.students.map((s) => ({
          studentProfileId: s.studentProfileId,
          name: s.student.user.name,
          chessComUsername: s.student.chessAccount?.chessComUsername ?? null,
          lichessUsername: s.student.chessAccount?.lichessUsername ?? null,
        }))
      )
      .filter((s, idx, arr) => arr.findIndex((x) => x.studentProfileId === s.studentProfileId) === idx);

    const leaderboardData = await getLeaderboard(period);

    const { periodStart: pStartObj } = getCurrentPeriod(period);
    const periodStart = pStartObj.toISOString();

    const existingFeedbacks = await prisma.coachFeedback.findMany({
      where: {
        coachId: coachProfile.id,
        periodType: period,
        periodStart: new Date(periodStart),
        studentProfileId: { in: myStudentIds },
      },
    });

    const feedbackMap = Object.fromEntries(
      existingFeedbacks.map((f) => [f.studentProfileId, f])
    );

    return NextResponse.json({
      leaderboardData,
      myStudentIds,
      myStudents,
      feedbackMap,
      periodStart,
    });
    } catch (err: any) {
    // Re-throw Next.js redirect errors — they must not be swallowed
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    return NextResponse.json(
      { error: err.message || "Failed to fetch teacher leaderboard" },
      { status: 500 }
    );
    }
    });
