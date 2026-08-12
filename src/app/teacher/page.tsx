import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { getAssignmentReport } from "@/actions/assignment-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const user = await requireRole([Role.TEACHER]);
  const reportData = await getAssignmentReport() as any;
  const summary = reportData.success && reportData.summary 
    ? reportData.summary 
    : { totalStudents: 0, completedAll: 0, missing: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user.name.split(" ")[0]}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of your classes and student progress.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="col-span-full md:col-span-2 lg:col-span-1">
          <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-brand-600" />
              Assignment Report
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
              <div>
                <div className="text-2xl font-bold text-slate-900">{summary.totalStudents}</div>
                <div className="text-xs text-slate-500 mt-1">Total Students</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{summary.completedAll}</div>
                <div className="text-xs text-slate-500 mt-1">Completed All</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-rose-600">{summary.missing}</div>
                <div className="text-xs text-slate-500 mt-1">Missing</div>
              </div>
            </div>
            
            <Link href="/teacher/assignment-report" className="block w-full">
              <Button variant="secondary" className="w-full flex items-center justify-between">
                <span>View Detail Report</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
