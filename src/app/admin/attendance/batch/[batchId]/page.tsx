import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { ChevronLeft } from "lucide-react";
import { ClassLogExpandableRow } from "./class-log-row";
import { Badge } from "@/components/ui/badge";

export default async function BatchAttendanceDetailsPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  await requireRole([Role.ADMIN]);
  
  const { batchId } = await params;

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      coach: { include: { user: true } },
      classLogs: {
        orderBy: { date: "desc" },
        include: {
          coach: { include: { user: true } },
          attendance: {
            include: {
              student: { include: { user: true } },
            },
          },
        },
      },
    },
  });

  if (!batch) notFound();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <Link 
          href="/admin/attendance/batch" 
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-brand-600 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Batches
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{batch.name} Attendance</h1>
          <Badge variant="neutral">{batch.code}</Badge>
        </div>
        <p className="text-sm text-slate-500 mt-1">Coach: {batch.coach.user.name}</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {batch.classLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium text-slate-900 mb-1">No classes logged yet</p>
            <p>Once a coach holds a class and logs attendance, it will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Coach</th>
                  <th className="px-5 py-4">Topic</th>
                  <th className="px-5 py-4">Present</th>
                  <th className="px-5 py-4">Absent</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batch.classLogs.map(log => (
                  <ClassLogExpandableRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
