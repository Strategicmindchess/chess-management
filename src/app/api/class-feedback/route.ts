import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

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
    studentProfileId,
    cameraOffOver5Min,
    phoneUsedOver4Times,
    classQualityScore,
    conceptUnderstood,
    overallCoachScore,
  } = body as {
    classLogId: string;
    studentProfileId: string;
    cameraOffOver5Min?: boolean;
    phoneUsedOver4Times?: boolean;
    classQualityScore?: number;
    conceptUnderstood?: boolean;
    overallCoachScore?: number;
  };

  if (!classLogId || !studentProfileId) {
    return NextResponse.json({ error: "classLogId and studentProfileId are required" }, { status: 400 });
  }

  try {
    const feedback = await prisma.classFeedback.create({
      data: {
        classLogId,
        studentProfileId,
        cameraOffOver5Min: cameraOffOver5Min ?? false,
        phoneUsedOver4Times: phoneUsedOver4Times ?? false,
        classQualityScore: classQualityScore ?? null,
        conceptUnderstood: conceptUnderstood ?? true,
        overallCoachScore: overallCoachScore ?? null,
      },
    });

    // Trigger penalty recalculation for this class log
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/class-logs/${classLogId}/penalty`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

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
