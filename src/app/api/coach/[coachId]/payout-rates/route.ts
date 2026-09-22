import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { withLogging } from "../../../../../lib/api-logger";

type Params = { params: Promise<{ coachId: string }> };

// ─── GET /api/coach/[coachId]/payout-rates ────────────────────────────────────
// Admin or the coach themselves can read payout rates
// ─── PUT /api/coach/[coachId]/payout-rates ────────────────────────────────────
// Admin only: upsert a payout rate for a level + duration combination
// ─── DELETE /api/coach/[coachId]/payout-rates ─────────────────────────────────
// Admin only: remove a specific rate
export let GET = withLogging(async function(_req: NextRequest, { params }: Params) {
    try {
    await requireRole([Role.ADMIN, Role.TEACHER]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { coachId } = await params;

    const rates = await prisma.coachPayoutRate.findMany({
    where: { coachProfileId: coachId },
    orderBy: [{ level: "asc" }, { durationMins: "asc" }],
    });

    return NextResponse.json({ rates });
    });
export let PUT = withLogging(async function(req: NextRequest, { params }: Params) {
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

    const { level, durationMins, ratePerSession } = body as {
    level: string;
    durationMins: number;
    ratePerSession: number;
    };

    if (!level || !durationMins || ratePerSession === undefined) {
    return NextResponse.json({ error: "level, durationMins, and ratePerSession are required" }, { status: 400 });
    }

    try {
    const rate = await prisma.coachPayoutRate.upsert({
      where: {
        coachProfileId_level_durationMins: {
          coachProfileId: coachId,
          level: level as any,
          durationMins,
        },
      },
      update: { ratePerSession },
      create: {
        coachProfileId: coachId,
        level: level as any,
        durationMins,
        ratePerSession,
      },
    });
    return NextResponse.json({ rate });
    } catch (err) {
    console.error("[PUT /api/coach/[coachId]/payout-rates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    });
export let DELETE = withLogging(async function(req: NextRequest, { params }: Params) {
    try {
    await requireRole([Role.ADMIN]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { coachId } = await params;
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level");
    const durationMins = Number(searchParams.get("durationMins"));

    if (!level || !durationMins) {
    return NextResponse.json({ error: "level and durationMins are required" }, { status: 400 });
    }

    try {
    await prisma.coachPayoutRate.deleteMany({
      where: { coachProfileId: coachId, level: level as any, durationMins },
    });
    return NextResponse.json({ success: true });
    } catch (err) {
    console.error("[DELETE /api/coach/[coachId]/payout-rates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    });
