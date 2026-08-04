import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export default async function TeacherDashboardPage() {
  await requireRole([Role.TEACHER]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome to your Strategic Mind Chess dashboard.
        </p>
      </div>
      
      <EmptyState
        title="Dashboard Overview"
        description="We are currently redesigning this space to give you the best overview of your teaching metrics. For now, please use the navigation menu on the left."
      />
    </div>
  );
}
