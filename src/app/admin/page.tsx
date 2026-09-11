import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { AdminDashboardClient } from "./admin-dashboard-client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireRole([Role.ADMIN]);

  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    }>
      <AdminDashboardClient userName={user.name} />
    </Suspense>
  );
}

