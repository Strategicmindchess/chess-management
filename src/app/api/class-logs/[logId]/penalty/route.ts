import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

type Params = { params: Promise<{ logId: string }> };

// Penalty rulebook (admin can later make these configurable via DB)
const LATE_JOIN_PENALTY = (lateMinutes: number): number => {
  if (lateMinutes <= 2) return 0;
  if (lateMinutes <= 5) return 100;
  if (lateMinutes <= 10) return 200;
  return 500;
};

const ATTENDANCE_DELAY_PENALTY = 200; // Not marked within 24h
const CAMERA_OFF_PENALTY = 150;       // Per instance from feedback
const PHONE_USE_PENALTY = 250;        // Per instance from feedback (3rd+)

// ─── PATCH /api/class-logs/[logId]/penalty ────────────────────────────────────
// Admin: waive penalty, override penalty amount, or add note
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { logId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { penaltyWaived, penaltyAmount, penaltyNote } = body as {
    penaltyWaived?: boolean;
    penaltyAmount?: number;
    penaltyNote?: string;
  };

  try {
    const updated = await prisma.classLog.update({
      where: { id: logId },
      data: {
        ...(penaltyWaived !== undefined && { penaltyWaived }),
        ...(penaltyAmount !== undefined && { penaltyAmount }),
        ...(penaltyNote !== undefined && { penaltyNote }),
      },
    });
    return NextResponse.json({ classLog: updated });
  } catch (err) {
    console.error("[PATCH /api/class-logs/[logId]/penalty]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/class-logs/[logId]/penalty ─────────────────────────────────────
// Internal: auto-calculate penalty from class log data (called after coach marks class held)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireRole([Role.ADMIN, Role.TEACHER]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { logId } = await params;

  try {
    const log = await prisma.classLog.findUnique({
      where: { id: logId },
      include: { classInstance: true, classFeedbacks: true },
    });

    if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let totalPenalty = 0;
    const reasons: string[] = [];

    // 1. Late join penalty
    if (log.coachJoinedAt && log.classInstance) {
      const scheduledStart = new Date(
        `${log.classInstance.date.toISOString().slice(0, 10)}T${log.classInstance.startTime}`
      );
      const lateMs = log.coachJoinedAt.getTime() - scheduledStart.getTime();
      const lateMinutes = Math.max(0, Math.floor(lateMs / 60000));
      const latePenalty = LATE_JOIN_PENALTY(lateMinutes);
      if (latePenalty > 0) {
        totalPenalty += latePenalty;
        reasons.push(`Late join: ${lateMinutes} min late (₹${latePenalty})`);
      }
    }

    // 2. Attendance delay penalty (marked > 24h after class)
    if (log.attendanceMarkedAt && log.date) {
      const hoursDelay = (log.attendanceMarkedAt.getTime() - log.date.getTime()) / 3600000;
      if (hoursDelay > 24) {
        totalPenalty += ATTENDANCE_DELAY_PENALTY;
        reasons.push(`Attendance marked ${Math.floor(hoursDelay)}h late (₹${ATTENDANCE_DELAY_PENALTY})`);
      }
    }

    // 3. Student feedback penalties
    const cameraOffCount = log.classFeedbacks.filter(f => f.cameraOffOver5Min).length;
    const phoneUsedCount = log.classFeedbacks.filter(f => f.phoneUsedOver4Times).length;

    if (cameraOffCount > 0) {
      totalPenalty += CAMERA_OFF_PENALTY * cameraOffCount;
      reasons.push(`Camera off >5min (${cameraOffCount} reports, ₹${CAMERA_OFF_PENALTY * cameraOffCount})`);
    }

    if (phoneUsedCount >= 3) {
      totalPenalty += PHONE_USE_PENALTY;
      reasons.push(`Phone usage >4 times (₹${PHONE_USE_PENALTY})`);
    }

    const updated = await prisma.classLog.update({
      where: { id: logId },
      data: {
        penaltyAmount: totalPenalty,
        penaltyNote: reasons.join("; ") || null,
      },
    });

    return NextResponse.json({ classLog: updated, totalPenalty, reasons });
  } catch (err) {
    console.error("[POST /api/class-logs/[logId]/penalty]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export { LATE_JOIN_PENALTY, ATTENDANCE_DELAY_PENALTY, CAMERA_OFF_PENALTY, PHONE_USE_PENALTY };
