import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { createNotification } from "@/lib/notifications";
import { NotificationType, NotifPriority } from "@/generated/prisma/client";

// ─── POST /api/class-feedback ─────────────────────────────────────────────────
// Student submits feedback after class — triggers penalty recalculation
export async function POST(req: NextRequest) {
  try {
    await requireRole([Role.STUDENT]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    classLogId,
    cameraOffOver5Min,
    phoneUsedOver4Times,
    classQualityScore,
    conceptUnderstood,
    overallCoachScore,
  } = body as {
    classLogId: string;
    cameraOffOver5Min?: boolean;
    phoneUsedOver4Times?: boolean;
    classQualityScore?: number;
    conceptUnderstood?: boolean;
    overallCoachScore?: number;
  };

  if (!classLogId) {
    return NextResponse.json({ error: "classLogId is required" }, { status: 400 });
  }

  // Securely get the student profile for the authenticated user
  const user = await requireRole([Role.STUDENT]);
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });

  if (!studentProfile) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const studentProfileId = studentProfile.id;

  try {
    // If student didn't explicitly rate the coach, fall back to classQualityScore
    // so that the leaderboard Perf column has data to work with on recalculate.
    const resolvedOverallScore = overallCoachScore ?? classQualityScore ?? null;

    const feedback = await prisma.classFeedback.create({
      data: {
        classLogId,
        studentProfileId,
        cameraOffOver5Min: cameraOffOver5Min ?? false,
        phoneUsedOver4Times: phoneUsedOver4Times ?? false,
        classQualityScore: classQualityScore ?? null,
        conceptUnderstood: conceptUnderstood ?? true,
        overallCoachScore: resolvedOverallScore,
      },
    });

    // Check attendance for the current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        studentProfileId,
        classLog: { date: { gte: firstDay } },
      },
    });

    const totalClasses = attendanceRecords.length;
    if (totalClasses >= 4) { // Only alert if they have at least 4 classes tracked this month
      const presentCount = attendanceRecords.filter((r) => r.status === "PRESENT").length;
      const percentage = (presentCount / totalClasses) * 100;

      if (percentage < 75) {
        await createNotification({
          recipientId: user.id, // Alert the student
          type: NotificationType.ATTENDANCE_ALERT,
          title: "⚠️ Attendance Alert",
          message: `Your attendance this month is ${percentage.toFixed(0)}%. Please attend classes regularly to avoid score penalties.`,
          eventKey: `ATTENDANCE_ALERT:${studentProfileId}:${now.getFullYear()}-${now.getMonth()}`,
          priority: NotifPriority.HIGH,
          href: `/student/dashboard`, // Or student attendance page
        });
      }
    }

    // No immediate penalty calculation here.
    // The BullMQ penalty worker processes eligible ClassLogs in a daily scheduled run.
    return NextResponse.json({ feedback });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Feedback already submitted for this class" }, { status: 409 });
    }
    console.error("[POST /api/class-feedback]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── GET /api/class-feedback ──────────────────────────────────────────────────
// Admin: list feedback for a class log
export async function GET(req: NextRequest) {
  try {
    await requireRole([Role.ADMIN, Role.TEACHER]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const classLogId = searchParams.get("classLogId");

  if (!classLogId) {
    return NextResponse.json({ error: "classLogId is required" }, { status: 400 });
  }

  const feedbacks = await prisma.classFeedback.findMany({
    where: { classLogId },
    include: { student: { include: { user: { select: { name: true } } } } },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json({ feedbacks });
}

