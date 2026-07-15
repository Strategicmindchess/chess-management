import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { Role } from "@/lib/enums";

// `role` is a plain string, not the rendered nav items (which reference icon
// components). Sidebar/Topbar are Client Components that resolve the actual
// nav items — including their icons — from `NAV_ITEMS` themselves, since
// React component references cannot be passed as props from a Server
// Component to a Client Component.
export function DashboardShell({
  role,
  roleLabel,
  userName,
  userEmail,
  children,
}: {
  role: Role;
  roleLabel: string;
  userName: string;
  userEmail: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={role} roleLabel={roleLabel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} userEmail={userEmail} roleLabel={roleLabel} role={role} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
