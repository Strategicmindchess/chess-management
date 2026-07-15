import type { ReactNode } from "react";
import { requireRole } from "@/lib/dal";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ROLE_LABEL } from "@/lib/constants";
import { Role } from "@/lib/enums";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole([Role.ADMIN]);

  return (
    <DashboardShell
      role={Role.ADMIN}
      roleLabel={ROLE_LABEL.ADMIN}
      userName={user.name}
      userEmail={user.email}
    >
      {children}
    </DashboardShell>
  );
}
