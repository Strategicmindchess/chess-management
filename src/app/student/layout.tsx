import type { ReactNode } from "react";
import { requireRole } from "@/lib/dal";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ROLE_LABEL } from "@/lib/constants";
import { Role } from "@/lib/enums";

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole([Role.STUDENT]);

  return (
    <DashboardShell
      role={Role.STUDENT}
      roleLabel={ROLE_LABEL.STUDENT}
      userName={user.name}
    >
      {children}
    </DashboardShell>
  );
}
