import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { getAssignmentReport } from "@/actions/assignment-actions";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TeacherAssignmentReportPage() {
  await requireRole([Role.TEACHER]);
  
  const reportData = await getAssignmentReport() as any;
  const detailed = reportData.success ? reportData.detailed : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teacher">
          <Button variant="ghost" className="p-2 h-auto text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-[#1a1f2e]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Assignment Detailed Report
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Student assignment progress and missing items.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200/90 dark:border-slate-700/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-[#111723] text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Student Name</th>
                <th className="px-6 py-4 font-semibold">Batch</th>
                <th className="px-6 py-4 font-semibold">Progress</th>
                <th className="px-6 py-4 font-semibold">Missing Assignments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {detailed.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No assignment data found.
                  </td>
                </tr>
              )}
              {detailed.map((student: any) => (
                <tr key={student.studentId} className="hover:bg-slate-50/70 dark:hover:bg-[#111723]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-200">{student.name}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs">{student.email}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                    {student.batches || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {Math.round(student.percentage)}%
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({student.totalScore}/{student.totalAssigned})
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {student.missingAssignments.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-4 w-4" /> All Completed
                      </span>
                    ) : (
                      <div className="space-y-1">
                        {student.missingAssignments.map((missing: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs">
                            <XCircle className="h-3.5 w-3.5 text-rose-500 mt-0.5 shrink-0" />
                            <span className="text-slate-600 dark:text-slate-400">
                              <span className="font-medium text-slate-800 dark:text-slate-200">{missing.title}</span>
                              <span className="text-slate-500 ml-1">({missing.batchName})</span>
                              {missing.status === "HALF_DONE" && (
                                <span className="ml-1 text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium">Half Done</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

