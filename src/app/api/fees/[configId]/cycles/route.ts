import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

type Params = { params: Promise<{ configId: string }> };

// ─── POST /api/fees/[configId]/cycles ─────────────────────────────────────────
// Adds a new FeeCycle to an existing StudentFeeConfig.
// Body for MONTHLY:     { dueDate?, classes?, amount }
// Body for BATCH_BASED: { batchCode?, batchName?, amount }
export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { configId } = await params;

  let body: {
    dueDate?: string | null;
    classes?: number | null;
    amount?: number;
    batchCode?: string | null;
    batchName?: string | null;
    notes?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const cycle = await prisma.feeCycle.create({
      data: {
        feeConfigId: configId,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        classes: body.classes ?? null,
        amount: body.amount ?? 0,
        batchCode: body.batchCode ?? null,
        batchName: body.batchName ?? null,
        notes: body.notes ?? null,
        status: "UNPAID",
      },
    });

    return NextResponse.json({ cycle }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/fees/[configId]/cycles]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH /api/fees/[configId]/cycles?cycleId=… ─────────────────────────────
// Updates a specific FeeCycle. Accepts cycleId via query param.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { configId } = await params;
  const cycleId = req.nextUrl.searchParams.get("cycleId");

  if (!cycleId) {
    return NextResponse.json({ error: "cycleId query param is required" }, { status: 400 });
  }

  let body: {
    status?: string;
    paidDate?: string | null;
    dueDate?: string | null;
    classes?: number | null;
    amount?: number;
    batchCode?: string | null;
    batchName?: string | null;
    notes?: string | null;
    isHidden?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const cycle = await prisma.feeCycle.update({
      where: { id: cycleId, feeConfigId: configId },
      data: {
        ...(body.status !== undefined && { status: body.status as "PAID" | "UNPAID" | "WAIVED" }),
        ...(body.paidDate !== undefined && { paidDate: body.paidDate ? new Date(body.paidDate) : null }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.classes !== undefined && { classes: body.classes }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.batchCode !== undefined && { batchCode: body.batchCode }),
        ...(body.batchName !== undefined && { batchName: body.batchName }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.isHidden !== undefined && { isHidden: body.isHidden }),
      },
    });

    return NextResponse.json({ cycle });
  } catch (err) {
    console.error("[PATCH /api/fees/[configId]/cycles]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/fees/[configId]/cycles?cycleId=… ────────────────────────────
// Deletes a specific FeeCycle by cycleId query param.
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { configId } = await params;
  const cycleId = req.nextUrl.searchParams.get("cycleId");

  if (!cycleId) {
    return NextResponse.json({ error: "cycleId query param is required" }, { status: 400 });
  }

  try {
    await prisma.feeCycle.delete({ where: { id: cycleId, feeConfigId: configId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/fees/[configId]/cycles]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
