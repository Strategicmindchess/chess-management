"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { updateAssignmentStatus } from "@/actions/assignment-actions";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";

export function StudentAssignmentCard({ assignment }: { assignment: any }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setIsUpdating(true);
    const result = await updateAssignmentStatus(
      assignment.id,
      value as "NOT_DONE" | "HALF_DONE" | "FULLY_DONE"
    );

    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to update assignment status.");
    }
    setIsUpdating(false);
  };

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md border-slate-200 flex flex-col">
      <div className={`absolute top-0 left-0 w-1 h-full ${assignment.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
      <CardHeader className="pb-3 pt-5 pl-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <span className="text-xs font-medium text-slate-500 mb-1 block">
              Lecture {assignment.lectureNumber} {assignment.batchName && <span className="opacity-75 font-normal ml-1">• {assignment.batchName}</span>}
            </span>
            <CardTitle className="text-base font-bold text-slate-900 leading-tight">
              {assignment.title}
            </CardTitle>
          </div>
          {assignment.status === 'COMPLETED' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 whitespace-nowrap">
              <CheckCircle className="w-3.5 h-3.5" /> Done
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5" /> Pending
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pl-6 pb-5 flex flex-col flex-1">
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {assignment.description || "Complete the practice exercises on Lichess."}
        </p>

        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <Select
              disabled={isUpdating || assignment.status === 'COMPLETED'}
              defaultValue={assignment.completionLevel || "NOT_DONE"}
              onChange={handleStatusChange}
              className="w-[140px] h-8 text-xs"
            >
              <option value="NOT_DONE">Pending</option>
              <option value="HALF_DONE">Half Completed</option>
              <option value="FULLY_DONE">Completed</option>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Released: {assignment.releasedAt ? new Date(assignment.releasedAt).toLocaleDateString() : 'N/A'}
            </span>
            {assignment.url ? (
              <Link
                href={assignment.url}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
              >
                Practice <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="text-sm text-slate-400">No link provided</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
