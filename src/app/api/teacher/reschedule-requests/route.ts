import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { notifyAllAdmins } from "@/lib/notifications";
import { NotificationType, NotifPriority } from "@/generated/prisma/client";
import { withLogging } from "../../../../lib/api-logger";

export const dynamic = "force-dynamic";

// ─── GET /api/teacher/reschedule-requests ─────────────────────────────────────
// Coach views their own reschedule requests.
// ─── POST /api/teacher/reschedule-requests ────────────────────────────────────
// Coach submits a new reschedule request for a class instance.
export let GET = withLogging(async function(req: NextRequest) {
    let user: Awaited<ReturnType<typeof requireRole>>;
    try {
    user = await requireRole([Role.TEACHER]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const coach = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
    });
    if (!coach) {
    return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
    }

    const requests = await prisma.coachRescheduleRequest.findMany({
    where: { coachProfileId: coach.id },
    orderBy: { createdAt: "desc" },
    include: {
      classInstance: {
        include: {
          batch: { select: { name: true, code: true } },
        },
      },
      reviewedBy: { select: { name: true } },
      replacementCoach: { include: { user: { select: { name: true } } } },
    },
    take: 50,
    });

    return NextResponse.json({ requests });
    });
export let POST = withLogging(async function(req: NextRequest) {
    let user: Awaited<ReturnType<typeof requireRole>>;
    try {
    user = await requireRole([Role.TEACHER]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: {
    classInstanceId?: string;
    reason?: string;
    proposedDate?: string;
    proposedStartTime?: string;
    proposedEndTime?: string;
    };
    try {
    body = await req.json();
    } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { classInstanceId, reason, proposedDate, proposedStartTime, proposedEndTime } = body;

    if (!classInstanceId || !reason || !proposedDate || !proposedStartTime || !proposedEndTime) {
    return NextResponse.json(
      { error: "classInstanceId, reason, proposedDate, proposedStartTime, proposedEndTime are all required" },
      { status: 400 }
    );
    }

    const coach = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    include: { user: { select: { name: true } } },
    });
    if (!coach) {
    return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
    }

    // Verify the class instance belongs to this coach's batch
    const classInstance = await prisma.classInstance.findUnique({
    where: { id: classInstanceId },
    include: { batch: { select: { coachProfileId: true, name: true, code: true } } },
    });

    if (!classInstance) {
    return NextResponse.json({ error: "Class instance not found" }, { status: 404 });
    }
    if (classInstance.batch.coachProfileId !== coach.id) {
    return NextResponse.json({ error: "You can only reschedule classes assigned to you" }, { status: 403 });
    }

    // Check for existing pending request for this class
    const existingPending = await prisma.coachRescheduleRequest.findFirst({
    where: { classInstanceId, coachProfileId: coach.id, status: "PENDING" },
    });
    if (existingPending) {
    return NextResponse.json(
      { error: "A pending reschedule request already exists for this class" },
      { status: 409 }
    );
    }

    const request = await prisma.coachRescheduleRequest.create({
    data: {
      classInstanceId,
      coachProfileId: coach.id,
      reason,
      proposedDate: new Date(proposedDate),
      proposedStartTime,
      proposedEndTime,
    },
    });

    // Count approved requests for this coach this month for penalty guidance
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const approvedThisMonth = await prisma.coachRescheduleRequest.count({
    where: {
      coachProfileId: coach.id,
      status: { in: ["APPROVED", "APPROVED_WITH_PENALTY"] },
      reviewedAt: { gte: monthStart },
    },
    });

    // Notify admins with URGENT priority
    const classDate = classInstance.date.toLocaleDateString("en-IN");
    await notifyAllAdmins({
    type: NotificationType.RESCHEDULE_REQUEST,
    title: "🔴 Coach Reschedule Request",
    message: `${coach.user.name} has requested to reschedule class on ${classDate} (${classInstance.batch.code}). Proposed: ${new Date(proposedDate).toLocaleDateString("en-IN")} ${proposedStartTime}–${proposedEndTime}. Reason: ${reason.slice(0, 80)}${reason.length > 80 ? "…" : ""}`,
    baseEventKey: `RESCHEDULE_REQUEST:${request.id}`,
    priority: NotifPriority.URGENT,
    href: `/admin/reschedule-requests`,
    });

    return NextResponse.json({ request, approvedThisMonth });
    });
