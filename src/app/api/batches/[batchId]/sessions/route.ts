import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    await requireRole([Role.ADMIN]);
    const { batchId } = await params;

    const instances = await prisma.classInstance.findMany({
      where: { batchId },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const sessions = instances.map((inst) => ({
      id: inst.id,
      date: inst.date.toISOString(),
      startTime: inst.startTime,
      endTime: inst.endTime,
      status: inst.status,
      lectureName: inst.lectureName,
      sessionNumber: inst.sessionNumber,
    }));

    return NextResponse.json({ sessions });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
