import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Card } from "@/components/ui/card";
import { CreateBatchButton } from "@/components/admin/create-batch-dialog";
import { BatchList } from "@/components/admin/batch-list";

export const metadata: Metadata = { title: "Batches · SMC CRM" };

export default async function AdminBatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string }>;
}) {
  await requireRole([Role.ADMIN]);

  const { page, query } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const take = 20;
  const skip = (currentPage - 1) * take;

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { code: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [batches, totalBatches, coachesData, studentsData] = await Promise.all([
    prisma.batch.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take,
      skip,
      include: {
        coach: { include: { user: { select: { id: true, name: true, email: true } } } },
        schedules: { orderBy: { startTime: "asc" } },
        students: {
          include: {
            student: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
      },
    }),
    prisma.batch.count({ where }),
    prisma.coachProfile.findMany({
      where: { user: { isActive: true } },
      include: { 
        user: { select: { name: true, email: true } },
        availabilities: true
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.studentProfile.findMany({
      where: { user: { isActive: true } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    })
  ]);

  const coaches = coachesData.map(c => ({
    id: c.id,
    name: c.user.name,
    email: c.user.email,
    availabilities: c.availabilities.map(a => ({
      date: a.date.toISOString(),
      startTime: a.startTime,
      endTime: a.endTime,
    })),
  }));

  const students = studentsData.map((s) => ({
    id: s.id,
    name: s.user.name,
    email: s.user.email,
  }));

  const batchItems = batches.map((batch) => ({
    id: batch.id,
    name: batch.name,
    code: batch.code,
    meetLink: batch.meetLink,
    isActive: batch.isActive,
    startDate: batch.startDate,
    coach: batch.coach ? { id: batch.coach.id, name: batch.coach.user.name, email: batch.coach.user.email } : null,
    schedules: batch.schedules.map((slot) => ({
      id: slot.id,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
    students: batch.students.map((bs) => ({ id: bs.student.id, name: bs.student.user.name, email: bs.student.user.email })),
  }));

  const totalPages = Math.ceil(totalBatches / take);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Batches</h1>
          <p className="text-sm text-slate-500">
            Create batches, assign coaches, and enroll students.
          </p>
        </div>
        <CreateBatchButton coaches={coaches} />
      </div>

      <Card className="overflow-hidden">
        <BatchList 
          batches={batchItems} 
          coaches={coaches} 
          students={students} 
          currentPage={currentPage}
          totalPages={totalPages}
          searchParams={{ query: query || "" }}
        />
      </Card>
    </div>
  );
}
