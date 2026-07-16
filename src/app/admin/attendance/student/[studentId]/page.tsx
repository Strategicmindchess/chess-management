import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function StudentAttendanceLedgerPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireRole([Role.ADMIN]);
  
  const { studentId } = await params;

  const student = await prisma.user.findUnique({
    where: { id: studentId, role: Role.STUDENT },
    include: {
      studentProfile: {
        include: {
          attendanceRecords: {
            orderBy: { classLog: { date: "desc" } },
            include: {
              classLog: {
                include: {
                  batch: true,
                  coach: { include: { user: true } },
                }
              }
            }
          }
        }
      }
    }
  });

  if (!student || !student.studentProfile) notFound();

  const records = student.studentProfile.attendanceRecords;
  const presentCount = records.filter(r => r.status === "PRESENT").length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link 
          href="/admin/attendance/student" 
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-brand-600 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Students
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{student.name}'s Ledger</h1>
            <p className="text-sm text-slate-500 mt-1">{student.email}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-500">Attendance</div>
            <div className="text-lg font-bold text-slate-900">
              {records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {records.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium text-slate-900 mb-1">No attendance records found</p>
            <p>This student hasn't been marked present or absent for any classes yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Batch</th>
                  <th className="px-5 py-4">Coach</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {format(new Date(record.classLog.date), "dd MMM yyyy")}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
                      {record.classLog.batch.name}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
                      {record.classLog.coach.user.name}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm">
                      <Badge variant={record.status === "PRESENT" ? "success" : "danger"}>
                        {record.status === "PRESENT" ? "Present" : "Absent"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
