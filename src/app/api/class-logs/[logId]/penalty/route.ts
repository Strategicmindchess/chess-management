import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

type Params = { params: Promise<{ logId: string }> };

// ─── PATCH /api/class-logs/[logId]/penalty ────────────────────────────────────
// Admin: waive penalty, override penalty amount, or add note.
//
// When admin takes any manual action (waive or amount override), this endpoint
// also sets adminPenaltyOverride = true and penaltyCalculatedAt = now() so the
// BullMQ penalty worker will permanently skip this ClassLog in all future runs.
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
    // Any change to waived state or amount is considered a manual admin action.
    const isManualAction = penaltyWaived !== undefined || penaltyAmount !== undefined;

    const updated = await prisma.classLog.update({
      where: { id: logId },
      data: {
        ...(penaltyWaived !== undefined && { penaltyWaived }),
        ...(penaltyAmount !== undefined && { penaltyAmount }),
        ...(penaltyNote !== undefined && { penaltyNote }),
        // Lock the record from the worker permanently
        ...(isManualAction && {
          adminPenaltyOverride: true,
          penaltyCalculatedAt: new Date(),
        }),
      },
    });
    return NextResponse.json({ classLog: updated });
  } catch (err) {
    console.error("[PATCH /api/class-logs/[logId]/penalty]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
