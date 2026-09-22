import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { withLogging } from "../../../../lib/api-logger";

export const dynamic = "force-dynamic";

// ─── GET /api/admin/reschedule-requests ───────────────────────────────────────
// Admin views all reschedule requests, optionally filtered by status.
export let GET = withLogging(async function(req: NextRequest) {
    try {
    await requireRole([Role.ADMIN]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // "PENDING" | "APPROVED" | "REJECTED" | null (all)

    const requests = await prisma.coachRescheduleRequest.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
    },
    orderBy: [
      { status: "asc" }, // PENDING first
      { createdAt: "desc" },
    ],
    include: {
      classInstance: {
        include: {
          batch: { select: { name: true, code: true, meetLink: true } },
        },
      },
      coach: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      reviewedBy: { select: { id: true, name: true } },
      replacementCoach: { include: { user: { select: { name: true } } } },
    },
    });

    // For each coach, count approved requests this month for penalty guidance
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const enriched = await Promise.all(
    requests.map(async (r) => {
      const approvedThisMonth = await prisma.coachRescheduleRequest.count({
        where: {
          coachProfileId: r.coachProfileId,
          status: { in: ["APPROVED", "APPROVED_WITH_PENALTY"] },
          reviewedAt: { gte: monthStart },
        },
      });
      return {
        id: r.id,
        status: r.status,
        reason: r.reason,
        proposedDate: r.proposedDate,
        proposedStartTime: r.proposedStartTime,
        proposedEndTime: r.proposedEndTime,
        penaltyAmount: r.penaltyAmount,
        penaltyReason: r.penaltyReason,
        rejectionReason: r.rejectionReason,
        reviewedAt: r.reviewedAt,
        reviewedBy: r.reviewedBy?.name ?? null,
        createdAt: r.createdAt,
        coach: {
          id: r.coach.id,
          name: r.coach.user.name,
          email: r.coach.user.email,
          approvedThisMonth,
          /// Admin should see penalty option if this approval would be the 3rd+ for the month
          shouldOfferPenalty: approvedThisMonth >= 2,
        },
        classInstance: {
          id: r.classInstance.id,
          date: r.classInstance.date,
          startTime: r.classInstance.startTime,
          endTime: r.classInstance.endTime,
          batchName: r.classInstance.batch.name,
          batchCode: r.classInstance.batch.code,
        },
        replacementCoach: r.replacementCoach
          ? { name: r.replacementCoach.user.name }
          : null,
      };
    })
    );

    const pendingCount = enriched.filter((r) => r.status === "PENDING").length;

    return NextResponse.json({ requests: enriched, pendingCount });
    });
