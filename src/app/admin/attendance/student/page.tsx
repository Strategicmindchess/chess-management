import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronRight, CalendarDays } from "lucide-react";
import { Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AttendanceSearchBar } from "@/components/admin/attendance/search-bar";

export default async function AttendanceStudentListPage({
  searchParams
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  await requireRole([Role.ADMIN]);

  const { query } = await searchParams;

  const students = await prisma.user.findMany({
    where: { 
      role: Role.STUDENT,
      emailVerified: true,
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {})
    },
    include: {
      studentProfile: {
        include: {
          _count: { select: { attendanceRecords: true } }
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance by Student</h1>
          <p className="text-sm text-slate-500 mt-1">Select a student to view their complete attendance ledger.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/attendance/batch">
            <Badge variant="neutral" className="cursor-pointer px-4 py-1 opacity-75 hover:opacity-100">By Batch</Badge>
          </Link>
          <Link href="/admin/attendance/student">
            <Badge variant="brand" className="cursor-pointer px-4 py-1">By Student</Badge>
          </Link>
        </div>
      </div>
      
      <div className="pt-2">
        <Suspense fallback={<div className="h-10 w-full max-w-sm bg-slate-100 animate-pulse rounded-md"></div>}>
          <AttendanceSearchBar placeholder="Search students..." />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map(student => {
          const recordCount = student.studentProfile?._count.attendanceRecords || 0;
          return (
            <Link key={student.id} href={`/admin/attendance/student/${student.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 h-full flex flex-col group">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-brand-900 group-hover:text-brand-600 transition-colors">
                      {student.name}
                    </CardTitle>
                    <div className="text-sm text-slate-500 mt-0.5">{student.email}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                </CardHeader>
                <CardContent className="pt-4 flex-grow">
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    <span>{recordCount} Attendance Records</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
