import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { Card, CardContent } from "@/components/ui/card";

export default async function StudentDashboardPage() {
  const user = await requireRole([Role.STUDENT]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500">
          This is your dashboard.
        </p>
      </div>

      <Card>
        <CardContent className="py-6 text-sm text-slate-600">
          Fee status, feedback forms, and ticket support will be added in
          upcoming modules.
        </CardContent>
      </Card>
    </div>
  );
}
