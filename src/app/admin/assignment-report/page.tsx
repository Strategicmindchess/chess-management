import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { getAssignmentReport } from "@/actions/assignment-actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AssignmentReportTable } from "@/components/assignment-report-table";

export const dynamic = "force-dynamic";

export default async function AdminAssignmentReportPage() {
  await requireRole([Role.ADMIN]);
  
  const reportData = await getAssignmentReport() as any;
  const detailed = reportData.success ? reportData.detailed : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" className="p-2 h-auto hover:bg-[#1a1f2e] text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Assignment Detailed Report
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Student assignment progress and missing items.
          </p>
        </div>
      </div>

      <AssignmentReportTable detailed={detailed} />
    </div>
  );
}

