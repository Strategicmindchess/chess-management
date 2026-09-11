import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

// ─── GET /api/employees — list all employees ──────────────────────────────────
export async function GET() {
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employees = await prisma.employeeProfile.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ employees });
}

// ─── POST /api/employees — create employee ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    name, phone, email, jobRole, employeeType, employmentMode,
    fixedSalary, projectRate, tdsApplicable, joiningDate,
  } = body as {
    name: string;
    phone?: string;
    email?: string;
    jobRole: string;
    employeeType?: "FULL_TIME" | "PART_TIME";
    employmentMode?: "EMPLOYEE" | "FREELANCER" | "EMPLOYER";
    fixedSalary?: number;
    projectRate?: number;
    tdsApplicable?: boolean;
    joiningDate?: string;
  };

  if (!name || !jobRole) {
    return NextResponse.json({ error: "name and jobRole are required" }, { status: 400 });
  }

  try {
    const employee = await prisma.employeeProfile.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        jobRole,
        employeeType: employeeType ?? "FULL_TIME",
        employmentMode: employmentMode ?? "EMPLOYEE",
        fixedSalary: fixedSalary ?? 0,
        projectRate: projectRate ?? 0,
        tdsApplicable: tdsApplicable ?? false,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
      },
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/employees]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

