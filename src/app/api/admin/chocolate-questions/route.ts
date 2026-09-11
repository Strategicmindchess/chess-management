import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

export const dynamic = "force-dynamic";

// ─── GET /api/admin/chocolate-questions ───────────────────────────────────────
// Admin views all students' chocolate question records and eligibility for a month.
export async function GET(req: NextRequest) {
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = searchParams.get("month") || defaultMonth;

  const eligibilities = await prisma.chocolateEligibility.findMany({
    where: { month },
    orderBy: [{ isEligible: "desc" }, { totalPoints: "desc" }],
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignedCoach: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });

  const records = await prisma.chocolateQuestionRecord.findMany({
    where: { month },
    include: {
      coach: { include: { user: { select: { name: true } } } },
      student: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group records by student for the detail view
  const recordsByStudent = new Map<string, typeof records>();
  for (const r of records) {
    const arr = recordsByStudent.get(r.studentProfileId) ?? [];
    arr.push(r);
    recordsByStudent.set(r.studentProfileId, arr);
  }

  const summary = eligibilities.map((e) => ({
    studentProfileId: e.studentProfileId,
    studentName: e.student.user.name,
    studentEmail: e.student.user.email,
    coachName: e.student.assignedCoach?.user.name ?? "—",
    month: e.month,
    totalPoints: e.totalPoints,
    isEligible: e.isEligible,
    eligibleAt: e.eligibleAt,
    rewardGiven: e.rewardGiven,
    rewardGivenAt: e.rewardGivenAt,
    questions: (recordsByStudent.get(e.studentProfileId) ?? []).map((r) => ({
      questionNumber: r.questionNumber,
      isCorrect: r.isCorrect,
      points: r.points,
      note: r.note,
      coachName: r.coach.user.name,
      createdAt: r.createdAt,
    })),
  }));

  return NextResponse.json({ summary, month });
}

