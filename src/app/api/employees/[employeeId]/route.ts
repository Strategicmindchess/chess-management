import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { withLogging } from "../../../../lib/api-logger";

type Params = { params: Promise<{ employeeId: string }> };

// ─── PATCH /api/employees/[employeeId] — update employee details ───────────────
// ─── DELETE /api/employees/[employeeId] — soft delete (deactivate) ────────────
export let PATCH = withLogging(async function(req: NextRequest, { params }: Params) {
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

    try {
    const updated = await prisma.employeeProfile.update({
      where: { id: employeeId },
      data: {
        ...(body.name !== undefined && { name: body.name as string }),
        ...(body.phone !== undefined && { phone: body.phone as string | null }),
        ...(body.email !== undefined && { email: body.email as string | null }),
        ...(body.jobRole !== undefined && { jobRole: body.jobRole as string }),
        ...(body.employeeType !== undefined && { employeeType: body.employeeType as any }),
        ...(body.employmentMode !== undefined && { employmentMode: body.employmentMode as any }),
        ...(body.fixedSalary !== undefined && { fixedSalary: Number(body.fixedSalary) }),
        ...(body.projectRate !== undefined && { projectRate: Number(body.projectRate) }),
        ...(body.tdsApplicable !== undefined && { tdsApplicable: body.tdsApplicable as boolean }),
        ...(body.isActive !== undefined && { isActive: body.isActive as boolean }),
        ...(body.joiningDate !== undefined && { joiningDate: body.joiningDate ? new Date(body.joiningDate as string) : null }),
      },
    });
    return NextResponse.json({ employee: updated });
    } catch (err) {
    console.error("[PATCH /api/employees/[employeeId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    });
export let DELETE = withLogging(async function(_req: NextRequest, { params }: Params) {
    try {
    await requireRole([Role.ADMIN]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { employeeId } = await params;
    try {
    await prisma.employeeProfile.update({
      where: { id: employeeId },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
    } catch (err) {
    console.error("[DELETE /api/employees/[employeeId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    });
