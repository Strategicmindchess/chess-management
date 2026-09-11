import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { createNotification, notifyAllAdmins } from "@/lib/notifications";
import { NotificationType, NotifPriority } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const MAX_QUESTIONS_PER_MONTH = 8;
const CORRECT_POINTS = 5;
const WRONG_POINTS = -2;
const CHOCOLATE_THRESHOLD = 40;

// ─── GET /api/teacher/chocolate-questions ─────────────────────────────────────
// Teacher views their students' chocolate question records + eligibility for a month.
export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireRole>>;
  try {
    user = await requireRole([Role.TEACHER]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = searchParams.get("month") || defaultMonth;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!coach) {
    return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
  }

  // Fetch records for all students this coach has awarded questions to this month
  const records = await prisma.chocolateQuestionRecord.findMany({
    where: { coachId: coach.id, month },
    include: {
      student: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by student
  const byStudent = new Map<string, typeof records>();
  for (const r of records) {
    const arr = byStudent.get(r.studentProfileId) ?? [];
    arr.push(r);
    byStudent.set(r.studentProfileId, arr);
  }

  // Fetch eligibility for these students
  const studentIds = [...byStudent.keys()];
  const eligibilities = await prisma.chocolateEligibility.findMany({
    where: { studentProfileId: { in: studentIds }, month },
  });
  const eligMap = new Map(eligibilities.map((e) => [e.studentProfileId, e]));

  const summary = [...byStudent.entries()].map(([studentProfileId, recs]) => {
    const student = recs[0].student;
    const totalPoints = recs.reduce((sum, r) => sum + r.points, 0);
    const elig = eligMap.get(studentProfileId);
    return {
      studentProfileId,
      studentName: student.user.name,
      questionsAsked: recs.length,
      remainingQuestions: MAX_QUESTIONS_PER_MONTH - recs.length,
      totalPoints,
      isEligible: elig?.isEligible ?? false,
      rewardGiven: elig?.rewardGiven ?? false,
      records: recs.map((r) => ({
        id: r.id,
        questionNumber: r.questionNumber,
        isCorrect: r.isCorrect,
        points: r.points,
        note: r.note,
        createdAt: r.createdAt,
      })),
    };
  });

  return NextResponse.json({ summary, month, maxQuestions: MAX_QUESTIONS_PER_MONTH });
}

// ─── POST /api/teacher/chocolate-questions ────────────────────────────────────
// Coach awards a question answer (correct/wrong) to a student.
export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireRole>>;
  try {
    user = await requireRole([Role.TEACHER]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { studentProfileId?: string; isCorrect?: boolean; note?: string; month?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { studentProfileId, isCorrect, note } = body;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = body.month || defaultMonth;

  if (!studentProfileId) {
    return NextResponse.json({ error: "studentProfileId is required" }, { status: 400 });
  }
  if (isCorrect === undefined || isCorrect === null) {
    return NextResponse.json({ error: "isCorrect is required" }, { status: 400 });
  }

  const coach = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!coach) {
    return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
  }

  // Check how many questions have already been asked this month
  const existingCount = await prisma.chocolateQuestionRecord.count({
    where: { studentProfileId, coachId: coach.id, month },
  });

  if (existingCount >= MAX_QUESTIONS_PER_MONTH) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_QUESTIONS_PER_MONTH} questions per student per month has been reached` },
      { status: 422 }
    );
  }

  const questionNumber = existingCount + 1;
  const points = isCorrect ? CORRECT_POINTS : WRONG_POINTS;

  // Create the question record
  const record = await prisma.chocolateQuestionRecord.create({
    data: {
      studentProfileId,
      coachId: coach.id,
      month,
      questionNumber,
      isCorrect,
      points,
      note: note ?? null,
    },
  });

  // Update or create ChocolateEligibility with running total
  const allRecords = await prisma.chocolateQuestionRecord.findMany({
    where: { studentProfileId, month },
    select: { points: true },
  });
  const totalPoints = allRecords.reduce((sum, r) => sum + r.points, 0);
  const isEligible = totalPoints >= CHOCOLATE_THRESHOLD;

  const prevElig = await prisma.chocolateEligibility.findUnique({
    where: { studentProfileId_month: { studentProfileId, month } },
  });

  const eligibility = await prisma.chocolateEligibility.upsert({
    where: { studentProfileId_month: { studentProfileId, month } },
    create: {
      studentProfileId,
      month,
      totalPoints,
      isEligible,
      eligibleAt: isEligible ? new Date() : null,
    },
    update: {
      totalPoints,
      isEligible,
      eligibleAt: isEligible && !prevElig?.isEligible ? new Date() : prevElig?.eligibleAt,
    },
  });

  // If student just crossed the threshold, notify all admins
  if (isEligible && !prevElig?.isEligible) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { user: { select: { name: true } } },
    });
    await notifyAllAdmins({
      type: NotificationType.CHOCOLATE_ELIGIBLE,
      title: "🍫 Student Eligible for Chocolate!",
      message: `${student?.user.name ?? "A student"} has reached ${totalPoints} chocolate points in ${month} and is eligible for a chocolate reward!`,
      baseEventKey: `CHOCOLATE_ELIGIBLE:${studentProfileId}:${month}`,
      priority: NotifPriority.HIGH,
      href: `/admin/leaderboard`,
    });
  }

  return NextResponse.json({ record, eligibility, totalPoints, isEligible });
}

