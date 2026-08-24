import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

type Params = { params: Promise<{ coachId: string }> };

// ─── GET /api/coach/[coachId]/adjustments ─────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireRole([Role.ADMIN, Role.TEACHER]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { coachId } = await params;
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "2026-08"

  const adjustments = await prisma.payoutAdjustment.findMany({
    where: {
      coachProfileId: coachId,
      ...(month ? { month } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ adjustments });
}

// ─── POST /api/coach/[coachId]/adjustments ────────────────────────────────────
// Admin only: add bonus / incentive / deduction for a month
export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { coachId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { month, type, amount, reason } = body as {
    month: string;
    type: "BONUS" | "INCENTIVE" | "DEDUCTION";
    amount: number;
    reason: string;
  };

  if (!month || !type || amount === undefined || !reason) {
    return NextResponse.json({ error: "month, type, amount, and reason are required" }, { status: 400 });
  }

  try {
    const adjustment = await prisma.payoutAdjustment.create({
      data: {
        coachProfileId: coachId,
        month,
        type,
        amount,
        reason,
      },
    });
    return NextResponse.json({ adjustment });
  } catch (err) {
    console.error("[POST /api/coach/[coachId]/adjustments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/coach/[coachId]/adjustments ──────────────────────────────────
// Admin only: remove an adjustment by id (passed as ?id=...)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await prisma.payoutAdjustment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/coach/[coachId]/adjustments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
