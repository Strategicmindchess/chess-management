import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import type { Prisma } from "@/generated/prisma/client";

// ─── GET /api/fees ────────────────────────────────────────────────────────────
// Returns all StudentFeeConfig rows with joined student info + cycles.
export async function GET() {
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const configs = await prisma.studentFeeConfig.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        cycles: {
          orderBy: { createdAt: "asc" },
        },
        student: {
          select: {
            id: true,
            city: true,
            level: true,
            assignedCoachId: true,
            assignedCoach: {
              select: {
                user: { select: { name: true } },
              },
            },
            enrollments: {
              select: {
                batch: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ configs });
  } catch (err) {
    console.error("[GET /api/fees]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/fees ───────────────────────────────────────────────────────────
// Body: { studentProfileId, feeType, feeAmount, classesPerCycle, frequency,
//         startDate, feeStartDate, notes, firstCycle? }
export async function POST(req: NextRequest) {
  try {
    await requireRole([Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    studentProfileId?: string;
    feeType?: string;
    feeAmount?: number;
    classesPerCycle?: number;
    frequency?: string;
    startDate?: string | null;
    feeStartDate?: string | null;
    notes?: string | null;
    firstCycle?: {
      dueDate?: string | null;
      classes?: number | null;
      amount?: number;
      batchCode?: string | null;
      batchName?: string | null;
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { studentProfileId, feeType, feeAmount, classesPerCycle, frequency,
          startDate, feeStartDate, notes, firstCycle } = body;

  if (!studentProfileId) {
    return NextResponse.json({ error: "studentProfileId is required" }, { status: 400 });
  }

  try {
    const config = await prisma.studentFeeConfig.create({
      data: {
        studentProfileId,
        feeType: (feeType as Prisma.EnumFeeTypeFilter["equals"]) ?? "MONTHLY",
        feeAmount: feeAmount ?? 0,
        classesPerCycle: classesPerCycle ?? 8,
        frequency: (frequency as Prisma.EnumFeeFrequencyFilter["equals"]) ?? "MONTHLY",
        startDate: startDate ? new Date(startDate) : null,
        feeStartDate: feeStartDate ? new Date(feeStartDate) : null,
        notes: notes ?? null,
        cycles: firstCycle
          ? {
              create: {
                dueDate: firstCycle.dueDate ? new Date(firstCycle.dueDate) : null,
                classes: firstCycle.classes ?? null,
                amount: firstCycle.amount ?? feeAmount ?? 0,
                batchCode: firstCycle.batchCode ?? null,
                batchName: firstCycle.batchName ?? null,
                status: "UNPAID",
              },
            }
          : undefined,
      },
      include: {
        cycles: true,
        student: {
          select: {
            id: true,
            city: true,
            level: true,
            enrollments: {
              select: {
                batch: { select: { id: true, code: true, name: true, type: true } },
              },
            },
            assignedCoach: {
              select: { user: { select: { name: true } } },
            },
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This student already has a fee configuration." },
        { status: 409 }
      );
    }
    console.error("[POST /api/fees]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

