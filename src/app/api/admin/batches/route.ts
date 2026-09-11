import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireRole([Role.ADMIN]);
  
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const query = searchParams.get("query") || "";
    const showInactive = searchParams.get("showInactive") || "false";

    const currentPage = Math.max(1, parseInt(page, 10));
    const take = 20;
    const skip = (currentPage - 1) * take;

    const where = {
      ...(showInactive === "true" ? {} : { isActive: true }),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { code: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [batches, totalBatches] = await Promise.all([
      prisma.batch.findMany({
        where,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        take,
        skip,
        select: {
          id: true,
          name: true,
          code: true,
          meetLink: true,
          isActive: true,
          startDate: true,
          type: true,
          payoutRate: true,
          level: true,
          startSession: true,
          coach: { select: { id: true, user: { select: { name: true, email: true } } } },
          schedules: { select: { id: true, day: true, startTime: true, endTime: true }, orderBy: { startTime: "asc" } },
          students: {
            select: {
              student: { select: { id: true, user: { select: { name: true, email: true } } } }
            }
          },
          _count: { select: { classInstances: true } }
        }
      }),
      prisma.batch.count({ where }),
    ]);

    // Batch status counts via groupBy
    const batchIds = batches.map((b) => b.id);
    const statusCounts = batchIds.length > 0
      ? await prisma.classInstance.groupBy({
          by: ['batchId', 'status'],
          _count: true,
          where: { batchId: { in: batchIds } },
        })
      : [];

    const statusMap = new Map<string, Record<string, number>>();
    for (const row of statusCounts) {
      if (!statusMap.has(row.batchId)) {
        statusMap.set(row.batchId, {});
      }
      statusMap.get(row.batchId)![row.status] = row._count;
    }

    const batchItems = batches.map((batch) => {
      const counts = statusMap.get(batch.id) ?? {};
      const completedInstances = counts['COMPLETED'] ?? 0;
      const scheduledInstances = counts['SCHEDULED'] ?? 0;
      const cancelledInstances = counts['CANCELLED'] ?? 0;
      const totalInstances = batch._count.classInstances;

      return {
        id: batch.id,
        name: batch.name,
        code: batch.code,
        meetLink: batch.meetLink,
        isActive: batch.isActive,
        startDate: batch.startDate,
        type: batch.type,
        coach: batch.coach ? { id: batch.coach.id, name: batch.coach.user.name, email: batch.coach.user.email } : null,
        schedules: batch.schedules,
        students: batch.students.map((bs) => ({ id: bs.student.id, name: bs.student.user.name, email: bs.student.user.email })),
        payoutRate: batch.payoutRate,
        totalInstances,
        completedInstances,
        scheduledInstances,
        cancelledInstances,
        level: batch.level,
        startSession: batch.startSession ?? 1,
      };
    });

    const totalPages = Math.ceil(totalBatches / take);

    return NextResponse.json({
      batches: batchItems,
      totalPages,
      currentPage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch batches" },
      { status: 500 }
    );
  }
}
