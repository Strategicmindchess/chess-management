import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { createNotification } from "@/lib/notifications";
import { NotificationType, NotifPriority } from "@/generated/prisma/client";

// ─── POST /api/admin/coach-leaderboard/[coachId]/award ────────────────────────
// Admin awards management points (0–100) to a coach for a given month.
// Can be called any time during the month. Overwrites previous award if any.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ coachId: string }> }
) {
  const { coachId } = await params;
  let admin: Awaited<ReturnType<typeof requireRole>>;
  try {
    admin = await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { month?: string; points?: number; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { points, note } = body;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = body.month || defaultMonth;

  if (points === undefined || points === null) {
    return NextResponse.json({ error: "points is required" }, { status: 400 });
  }
  if (points < 0 || points > 100) {
    return NextResponse.json({ error: "points must be between 0 and 100" }, { status: 400 });
  }

  // Verify coach exists
  const coach = await prisma.coachProfile.findUnique({
    where: { id: coachId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!coach) {
    return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  }

  // Upsert the entry, setting management points and recalculating total
  const existing = await prisma.coachLeaderboardEntry.findUnique({
    where: { coachProfileId_month: { coachProfileId: coachId, month } },
    select: { studentPerfScore: true, studentFeedScore: true, classQualityScore: true },
  });

  const autoScore = existing
    ? existing.studentPerfScore + existing.studentFeedScore + existing.classQualityScore
    : 0;

  const entry = await prisma.coachLeaderboardEntry.upsert({
    where: { coachProfileId_month: { coachProfileId: coachId, month } },
    create: {
      coachProfileId: coachId,
      month,
      managementPoints: points,
      managementNote: note ?? null,
      managementAwardedAt: new Date(),
      managementAwardedById: admin.id,
      totalScore: points, // auto scores are 0 since no calculation yet
    },
    update: {
      managementPoints: points,
      managementNote: note ?? null,
      managementAwardedAt: new Date(),
      managementAwardedById: admin.id,
      totalScore: autoScore + points,
    },
  });

  // Notify coach that management points have been awarded
  await createNotification({
    recipientId: coach.user.id,
    type: NotificationType.MANAGEMENT_POINTS_AWARDED,
    title: "Management Points Awarded",
    message: `You received ${points} management points for ${month}${note ? `: "${note}"` : ""}.`,
    eventKey: `MANAGEMENT_POINTS_AWARDED:${coachId}:${month}`,
    priority: NotifPriority.NORMAL,
    href: "/teacher/leaderboard",
  });

  return NextResponse.json({ success: true, entry });
}

// ─── GET /api/admin/coach-leaderboard/[coachId]/award ─────────────────────────
// Get current management points awarded to a coach for a month.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ coachId: string }> }
) {
  const { coachId } = await params;
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = searchParams.get("month") || defaultMonth;

  const entry = await prisma.coachLeaderboardEntry.findUnique({
    where: { coachProfileId_month: { coachProfileId: coachId, month } },
    select: { managementPoints: true, managementNote: true, managementAwardedAt: true },
  });

  return NextResponse.json({ entry, month });
}
