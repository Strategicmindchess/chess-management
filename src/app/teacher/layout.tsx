import type { ReactNode } from "react";
import { requireRole } from "@/lib/dal";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ROLE_LABEL } from "@/lib/constants";
import { Role } from "@/lib/enums";

export default async function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole([Role.TEACHER]);

  return (
    <DashboardShell
      role={Role.TEACHER}
      roleLabel={ROLE_LABEL.TEACHER}
      userName={user.name}
    >
      {children}
    </DashboardShell>
  );
}
