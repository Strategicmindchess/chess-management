import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

type Params = { params: Promise<{ coachId: string }> };

// ─── PATCH /api/coach/[coachId]/settings ──────────────────────────────────────
// Admin only: update TDS and employment type on coach profile
export async function PATCH(req: NextRequest, { params }: Params) {
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

  const { tdsApplicable, employmentType } = body as {
    tdsApplicable?: boolean;
    employmentType?: "COACH" | "EMPLOYEE" | "FREELANCER";
  };

  try {
    const updated = await prisma.coachProfile.update({
      where: { id: coachId },
      data: {
        ...(tdsApplicable !== undefined && { tdsApplicable }),
        ...(employmentType !== undefined && { employmentType }),
      },
    });
    return NextResponse.json({ coach: updated });
  } catch (err) {
    console.error("[PATCH /api/coach/[coachId]/settings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
