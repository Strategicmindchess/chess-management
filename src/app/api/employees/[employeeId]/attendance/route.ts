import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";
import { withLogging } from "../../../../../lib/api-logger";

type Params = { params: Promise<{ employeeId: string }> };

// ─── GET /api/employees/[employeeId]/attendance?month=2026-08 ─────────────────
// ─── POST /api/employees/[employeeId]/attendance — upsert a day ───────────────
export let GET = withLogging(async function(req: NextRequest, { params }: Params) {
    try {
    await requireRole([Role.ADMIN]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { employeeId } = await params;
    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get("month") || format(new Date(), "yyyy-MM");

    const date = parseISO(monthStr);
    const records = await prisma.employeeAttendance.findMany({
    where: {
      employeeProfileId: employeeId,
      date: { gte: startOfMonth(date), lte: endOfMonth(date) },
    },
    orderBy: { date: "asc" },
    });

    return NextResponse.json({ records });
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

    const {
    date, status, checkInTime, checkOutTime,
    workingHours, isOvertime, overtimeHours, overtimeBonus, notes,
    } = body as {
    date: string;
    status?: "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE" | "HOLIDAY";
    checkInTime?: string;
    checkOutTime?: string;
    workingHours?: number;
    isOvertime?: boolean;
    overtimeHours?: number;
    overtimeBonus?: number;
    notes?: string;
    };

    if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

    // Auto-calculate working hours if check-in/out provided
    let calcWorkingHours = workingHours;
    if (!calcWorkingHours && checkInTime && checkOutTime) {
    const [inH, inM] = checkInTime.split(":").map(Number);
    const [outH, outM] = checkOutTime.split(":").map(Number);
    calcWorkingHours = Math.max(0, (outH * 60 + outM - (inH * 60 + inM)) / 60);
    }

    const dayDate = new Date(date + "T00:00:00.000Z");

    try {
    const record = await prisma.employeeAttendance.upsert({
      where: { employeeProfileId_date: { employeeProfileId: employeeId, date: dayDate } },
      update: {
        status: status ?? "PRESENT",
        checkInTime: checkInTime ?? null,
        checkOutTime: checkOutTime ?? null,
        workingHours: calcWorkingHours ?? null,
        isOvertime: isOvertime ?? false,
        overtimeHours: overtimeHours ?? null,
        overtimeBonus: overtimeBonus ?? 0,
        notes: notes ?? null,
      },
      create: {
        employeeProfileId: employeeId,
        date: dayDate,
        status: status ?? "PRESENT",
        checkInTime: checkInTime ?? null,
        checkOutTime: checkOutTime ?? null,
        workingHours: calcWorkingHours ?? null,
        isOvertime: isOvertime ?? false,
        overtimeHours: overtimeHours ?? null,
        overtimeBonus: overtimeBonus ?? 0,
        notes: notes ?? null,
      },
    });
    return NextResponse.json({ record });
    } catch (err) {
    console.error("[POST /api/employees/[employeeId]/attendance]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    });
