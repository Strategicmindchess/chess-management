import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { ChevronLeft } from "lucide-react";
import { ClassLogExpandableRow } from "./class-log-row";
import { Badge } from "@/components/ui/badge";

import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { MonthPicker } from "@/components/ui/month-picker";

export default async function BatchAttendanceDetailsPage({
  params,
  searchParams
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  await requireRole([Role.ADMIN]);
  
  const { batchId } = await params;
  const { month } = await searchParams;

  const targetMonth = month ? parseISO(`${month}-01`) : new Date();
  const startDate = startOfMonth(targetMonth);
  const endDate = endOfMonth(targetMonth);

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      coach: { include: { user: true } },
      classLogs: {
        where: {
          date: { gte: startDate, lte: endDate }
        },
        orderBy: { date: "desc" },
          include: {
          coach: { include: { user: true } },
          attendance: {
            include: {
              student: { include: { user: true } },
            },
          },
          classFeedbacks: {
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
          className="inline-flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Batches
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{batch.name} Attendance</h1>
              <Badge variant="neutral">{batch.code}</Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Coach: <span className="font-medium text-slate-700 dark:text-slate-300">{batch.coach?.user.name || "Unassigned"}</span>
            </p>
          </div>
          <MonthPicker />
        </div>
      </div>

      <div className="relative overflow-hidden bg-white dark:bg-[#0f2a24]/90 dark:backdrop-blur-xl rounded-xl border border-slate-200 dark:border-teal-500/20 shadow-sm dark:shadow-[0_4px_20px_rgba(20,184,166,0.15)] group hover:dark:border-teal-500/50 transition-colors">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none hidden dark:block" />
        {batch.classLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 relative z-10">
            <p className="text-lg font-medium text-slate-900 dark:text-teal-400 mb-1">No classes logged yet</p>
            <p>Once a coach holds a class and logs attendance, it will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Coach</th>
                  <th className="px-5 py-4">Topic</th>
                  <th className="px-5 py-4">Present</th>
                  <th className="px-5 py-4">Absent</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
