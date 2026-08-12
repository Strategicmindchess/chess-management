import { CalendarDays, GraduationCap, UserCog, Users, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Role } from "@/lib/enums";
import { getAssignmentReport } from "@/actions/assignment-actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const user = await requireRole([Role.ADMIN]);

  const [reportDataResponse, studentCount, coachCount, activeBatchCount, unassignedBatchCount] =
    await Promise.all([
      getAssignmentReport(),
      prisma.user.count({ where: { role: Role.STUDENT, isActive: true } }),
      prisma.user.count({ where: { role: Role.TEACHER, isActive: true } }),
      prisma.batch.count({ where: { isActive: true } }),
      prisma.batch.count({ where: { isActive: true, coachProfileId: null } }),
    ]);

  const reportData = reportDataResponse as any;
  const summary = reportData.success && reportData.summary 
    ? reportData.summary 
    : { totalStudents: 0, completedAll: 0, missing: 0 };

  const stats = [
    { label: "Active students", value: studentCount, icon: GraduationCap },
    { label: "Active coaches", value: coachCount, icon: UserCog },
    { label: "Active batches", value: activeBatchCount, icon: CalendarDays },
    {
      label: "Batches needing a coach",
      value: unassignedBatchCount,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500">
          Here&apos;s a quick look at the academy right now.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {stat.value}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <stat.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-brand-600" />
              Assignment Report
            </h2>
          </div>
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
            
            <Link href="/admin/assignment-report" className="block w-full">
              <Button variant="secondary" className="w-full flex items-center justify-between">
                <span>View Detail Report</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Roadmap</p>
            <p>
              This is Phase 1 of the SMC CRM: authentication and core batch/coach
              management. Fee tracking, attendance, payouts, tickets, and the
              remaining modules from the brief will be added next, one at a time.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
