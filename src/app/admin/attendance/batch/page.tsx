import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronRight, CalendarDays, Users } from "lucide-react";
import { Suspense } from "react";
import { AttendanceSearchBar } from "@/components/admin/attendance/search-bar";

export default async function AttendanceBatchListPage({
  searchParams
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  await requireRole([Role.ADMIN]);
  
  const { query } = await searchParams;

  const batches = await prisma.batch.findMany({
    where: { 
      isActive: true,
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {})
    },
    include: {
      coach: { include: { user: true } },
      _count: { select: { classLogs: true, students: true } }
    },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance by Batch</h1>
          <p className="text-sm text-slate-500 mt-1">Select a batch to view its class logs and attendance records.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/attendance/batch">
            <Badge variant="brand" className="cursor-pointer px-4 py-1">By Batch</Badge>
          </Link>
          <Link href="/admin/attendance/student">
            <Badge variant="neutral" className="cursor-pointer px-4 py-1 opacity-75 hover:opacity-100">By Student</Badge>
          </Link>
        </div>
      </div>
      
      <div className="pt-2">
        <Suspense fallback={<div className="h-10 w-full max-w-sm bg-slate-100 animate-pulse rounded-md"></div>}>
          <AttendanceSearchBar placeholder="Search batches..." />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map(batch => (
          <Link key={batch.id} href={`/admin/attendance/batch/${batch.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 h-full flex flex-col group">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg text-brand-900 group-hover:text-brand-600 transition-colors">
                    {batch.name}
                  </CardTitle>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                </div>
                <div className="text-sm text-slate-500">Coach: {batch.coach.user.name}</div>
              </CardHeader>
              <CardContent className="pt-4 flex-grow">
                <div className="flex justify-between items-center text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    <span>{batch._count.classLogs} Classes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{batch._count.students} Students</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
