import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { withLogging } from "../../../../../../lib/api-logger";

// ─── POST /api/admin/chocolate-questions/[studentId]/reward ───────────────────
// Admin marks chocolate reward as given to an eligible student.
export let POST = withLogging(async function(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
    const { studentId } = await params;
    try {
    await requireRole([Role.ADMIN]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: { month?: string } = {};
    try {
    body = await req.json();
    } catch {}

    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = body.month || defaultMonth;

    const eligibility = await prisma.chocolateEligibility.findUnique({
    where: {
      studentProfileId_month: { studentProfileId: studentId, month },
    },
    });

    if (!eligibility) {
    return NextResponse.json({ error: "No eligibility record found for this student/month" }, { status: 404 });
    }
    if (!eligibility.isEligible) {
    return NextResponse.json({ error: "Student is not eligible for chocolate this month" }, { status: 422 });
    }

    const updated = await prisma.chocolateEligibility.update({
    where: { studentProfileId_month: { studentProfileId: studentId, month } },
    data: { rewardGiven: true, rewardGivenAt: new Date() },
    });

    return NextResponse.json({ success: true, eligibility: updated });
    });
