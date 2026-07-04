import { CalendarDays, GraduationCap, UserCog, Users } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Role } from "@/lib/enums";

export default async function AdminDashboardPage() {
  const user = await requireRole([Role.ADMIN]);

  const [studentCount, coachCount, activeBatchCount, unassignedBatchCount] =
    await Promise.all([
      prisma.user.count({ where: { role: Role.STUDENT, isActive: true } }),
      prisma.user.count({ where: { role: Role.TEACHER, isActive: true } }),
      prisma.batch.count({ where: { isActive: true } }),
      prisma.batch.count({ where: { isActive: true, coachId: null } }),
    ]);

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

      <Card>
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
  );
}
