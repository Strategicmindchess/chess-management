"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface StudentReport {
  studentId: string;
  name: string;
  email: string;
  batches: string;
  percentage: number;
  totalScore: number;
  totalAssigned: number;
  missingAssignments: {
    title: string;
    status: string;
    batchName: string;
  }[];
}

export function AssignmentReportTable({ detailed }: { detailed: StudentReport[] }) {
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);

  const openStudent = detailed.find(s => s.studentId === openStudentId);

  return (
    <div className="bg-[#1a1f2e] rounded-lg border border-slate-700/50 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#111723] text-slate-400 border-b border-slate-700/50">
            <tr>
              <th className="px-6 py-4 font-medium">Student Name</th>
              <th className="px-6 py-4 font-medium">Batch</th>
              <th className="px-6 py-4 font-medium">Progress</th>
              <th className="px-6 py-4 font-medium text-center">Missing Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {detailed.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                  No assignment data found.
                </td>
              </tr>
            )}
            {detailed.map((student) => (
              <tr key={student.studentId} className="hover:bg-[#111723]/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-200">{student.name}</div>
                  <div className="text-slate-400 text-xs">{student.email}</div>
                </td>
                <td className="px-6 py-4 text-slate-300">
                  {student.batches || "-"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {Math.round(student.percentage)}%
                    </span>
                    <span className="text-xs text-slate-400">
                      ({student.totalScore}/{student.totalAssigned})
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  {student.missingAssignments.length === 0 ? (
                    <span className="inline-flex items-center justify-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> All Completed
                    </span>
                  ) : (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => setOpenStudentId(student.studentId)}
                    >
                      <Eye className="h-4 w-4 text-brand-600" />
                      View {student.missingAssignments.length} Missing
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog 
        open={!!openStudentId} 
        onClose={() => setOpenStudentId(null)}
        title={`Missing Assignments - ${openStudent?.name || ''}`}
      >
        <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-2">
          {openStudent?.missingAssignments.map((missing, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-md bg-[#111723]/50 border border-slate-700/50">
              <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-white text-sm leading-tight">{missing.title}</p>
                <p className="text-xs text-slate-400">Batch: {missing.batchName}</p>
                {missing.status === "HALF_DONE" && (
                  <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                    Half Done
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

