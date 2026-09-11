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
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0f1419]">
      <Sidebar role={role} roleLabel={roleLabel} />
      <div className="flex min-w-0 flex-1 flex-col relative">
        {/* Global ambient background glow for all pages */}
        <div className="fixed top-[-10%] left-[10%] w-[800px] h-[800px] bg-brand-500/25 rounded-full blur-[150px] pointer-events-none -z-10 mix-blend-screen hidden dark:block animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="fixed top-[-10%] right-[-10%] w-[700px] h-[700px] bg-indigo-500/25 rounded-full blur-[150px] pointer-events-none -z-10 mix-blend-screen hidden dark:block animate-[pulse_12s_ease-in-out_infinite_reverse]" />
        <div className="fixed bottom-[-10%] left-[30%] w-[700px] h-[700px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none -z-10 mix-blend-screen hidden dark:block animate-[pulse_10s_ease-in-out_infinite]" />
        
        <Topbar userName={userName} userEmail={userEmail} roleLabel={roleLabel} role={role} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 dark:text-slate-200 z-0">{children}</main>
      </div>
    </div>
  );
}

