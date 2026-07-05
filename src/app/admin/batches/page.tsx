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
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole([Role.ADMIN]);

  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const take = 20;
  const skip = (currentPage - 1) * take;

  const [batches, totalBatches, coachesData, students] = await Promise.all([
    prisma.batch.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take,
      skip,
      include: {
        coach: { select: { id: true, name: true, email: true } },
        schedules: { orderBy: { startTime: "asc" } },
        students: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
    prisma.batch.count(),
    prisma.user.findMany({
      where: { role: Role.TEACHER, isActive: true },
      select: { 
        id: true, 
        name: true, 
        email: true,
        coachProfile: {
          select: {
            availabilities: {
              select: { dayOfWeek: true, startTime: true, endTime: true },
              orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
            }
          }
        }
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: Role.STUDENT, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    })
  ]);

  const coaches = coachesData.map(coach => ({
    id: coach.id,
    name: coach.name,
    email: coach.email,
    availabilities: coach.coachProfile?.availabilities || []
  }));

  const batchItems = batches.map((batch) => ({
    id: batch.id,
    name: batch.name,
    code: batch.code,
    meetLink: batch.meetLink,
    isActive: batch.isActive,
    coach: batch.coach,
    schedules: batch.schedules.map((slot) => ({
      id: slot.id,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
    students: batch.students.map((enrollment) => enrollment.student),
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
        />
      </Card>
    </div>
  );
}
