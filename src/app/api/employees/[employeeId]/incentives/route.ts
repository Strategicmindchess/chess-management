import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { withLogging } from "../../../../../lib/api-logger";

type Params = { params: Promise<{ employeeId: string }> };

// ─── GET /api/employees/[employeeId]/incentives?month=2026-08 ─────────────────
// ─── POST /api/employees/[employeeId]/incentives ──────────────────────────────
// ─── DELETE /api/employees/[employeeId]/incentives?id=xxx ─────────────────────
export let GET = withLogging(async function(req: NextRequest, { params }: Params) {
    try {
    await requireRole([Role.ADMIN]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { employeeId } = await params;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const incentives = await prisma.employeeIncentive.findMany({
    where: {
      employeeProfileId: employeeId,
      ...(month ? { month } : {}),
    },
    orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ incentives });
    });
export let POST = withLogging(async function(req: NextRequest, { params }: Params) {
    try {
    await requireRole([Role.ADMIN]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { employeeId } = await params;
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { month, type, amount, reason } = body as {
    month: string;
    type: "BONUS" | "INCENTIVE" | "DEDUCTION" | "ADVANCE";
    amount: number;
    reason: string;
    };

    if (!month || !type || amount === undefined || !reason) {
    return NextResponse.json({ error: "month, type, amount, reason required" }, { status: 400 });
    }

    try {
    const incentive = await prisma.employeeIncentive.create({
      data: { employeeProfileId: employeeId, month, type, amount, reason },
    });
    return NextResponse.json({ incentive }, { status: 201 });
    } catch (err) {
    console.error("[POST /api/employees/[employeeId]/incentives]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    });
export let DELETE = withLogging(async function(req: NextRequest) {
    try {
    await requireRole([Role.ADMIN]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    try {
    await prisma.employeeIncentive.delete({ where: { id } });
    return NextResponse.json({ success: true });
    } catch (err) {
    console.error("[DELETE /api/employees/[employeeId]/incentives]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    });
