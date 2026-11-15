import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { getStudentAssignments } from "@/actions/assignment-actions";
import { StudentAssignmentsClient } from "./student-assignments-client";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Assignments | SMC",
  description: "Track and solve your chess homework and class assignments",
};

export default async function StudentAssignmentsPage() {
  await requireRole([Role.STUDENT]);

  const result = await getStudentAssignments();

  if (!result.success) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/40 p-4 text-rose-800 dark:text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{result.error || "Failed to load assignments"}</p>
        </div>
      </div>
    );
  }

  const assignments = (result.data || []) as any[];
  const progress = result.progress || { total: 0, score: 0, percentage: 0 };

  return (
    <div className="p-6">
      <StudentAssignmentsClient
        initialAssignments={assignments}
        initialProgress={progress}
      />
    </div>
  );
}
