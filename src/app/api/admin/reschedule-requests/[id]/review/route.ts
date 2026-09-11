import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { createNotification } from "@/lib/notifications";
import { NotificationType, NotifPriority } from "@/generated/prisma/client";

// ─── POST /api/admin/reschedule-requests/[id]/review ──────────────────────────
// Admin approves, rejects, or approves with penalty a reschedule request.
// action: "APPROVE" | "REJECT" | "APPROVE_WITH_PENALTY"
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let admin: Awaited<ReturnType<typeof requireRole>>;
  try {
    admin = await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    action?: "APPROVE" | "REJECT" | "APPROVE_WITH_PENALTY";
    rejectionReason?: string;
    penaltyAmount?: number;
    penaltyReason?: string;
    replacementCoachId?: string;
    // Optional: if approved, optionally update the class instance to the proposed date/time
    applyReschedule?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, rejectionReason, penaltyAmount, penaltyReason, replacementCoachId, applyReschedule } = body;

  if (!action || !["APPROVE", "REJECT", "APPROVE_WITH_PENALTY"].includes(action)) {
    return NextResponse.json(
      { error: "action must be one of: APPROVE, REJECT, APPROVE_WITH_PENALTY" },
      { status: 400 }
    );
  }

  if (action === "APPROVE_WITH_PENALTY" && (penaltyAmount === undefined || penaltyAmount < 0)) {
    return NextResponse.json(
      { error: "penaltyAmount is required and must be >= 0 when action is APPROVE_WITH_PENALTY" },
      { status: 400 }
    );
  }

  const existing = await prisma.coachRescheduleRequest.findUnique({
    where: { id: id },
    include: {
      coach: { include: { user: { select: { id: true, name: true } } } },
      classInstance: {
        include: { batch: { select: { name: true, code: true } } },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Reschedule request not found" }, { status: 404 });
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Request has already been reviewed" }, { status: 409 });
  }

  const statusMap = {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    APPROVE_WITH_PENALTY: "APPROVED_WITH_PENALTY",
  } as const;

  const updated = await prisma.coachRescheduleRequest.update({
    where: { id: id },
    data: {
      status: statusMap[action],
      reviewedById: admin.id,
      reviewedAt: new Date(),
      rejectionReason: action === "REJECT" ? (rejectionReason ?? null) : null,
      penaltyAmount: action === "APPROVE_WITH_PENALTY" ? (penaltyAmount ?? 0) : 0,
      penaltyReason: action === "APPROVE_WITH_PENALTY" ? (penaltyReason ?? null) : null,
      replacementCoachId: replacementCoachId ?? null,
    },
  });

  // If approved and admin wants to apply the reschedule to the class instance
  if (action !== "REJECT" && applyReschedule) {
    await prisma.classInstance.update({
      where: { id: existing.classInstanceId },
      data: {
        date: existing.proposedDate,
        startTime: existing.proposedStartTime,
        endTime: existing.proposedEndTime,
        ...(replacementCoachId
          ? { batch: { update: { coachProfileId: replacementCoachId } } }
          : {}),
      },
    });
  }

  // Notify the coach of the decision
  const batchCode = existing.classInstance.batch.code;
  const classDate = existing.classInstance.date.toLocaleDateString("en-IN");

  let notifTitle: string;
  let notifMsg: string;
  if (action === "APPROVE") {
    notifTitle = "✅ Reschedule Request Approved";
    notifMsg = `Your reschedule request for class on ${classDate} (${batchCode}) has been approved.`;
  } else if (action === "APPROVE_WITH_PENALTY") {
    notifTitle = "⚠️ Reschedule Approved with Penalty";
    notifMsg = `Your reschedule request for class on ${classDate} (${batchCode}) was approved with a penalty of ₹${penaltyAmount}. Reason: ${penaltyReason ?? "—"}`;
  } else {
    notifTitle = "❌ Reschedule Request Rejected";
    notifMsg = `Your reschedule request for class on ${classDate} (${batchCode}) was rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`;
  }

  await createNotification({
    recipientId: existing.coach.user.id,
    type: NotificationType.RESCHEDULE_DECISION,
    title: notifTitle,
    message: notifMsg,
    eventKey: `RESCHEDULE_DECISION:${id}`,
    priority: action === "REJECT" ? NotifPriority.HIGH : NotifPriority.NORMAL,
    href: "/teacher/batches",
  });

  return NextResponse.json({ success: true, request: updated });
}
