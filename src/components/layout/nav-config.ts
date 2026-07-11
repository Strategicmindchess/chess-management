import { CalendarDays, LayoutDashboard, Users } from "lucide-react";
import { Role } from "@/lib/enums";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  [Role.ADMIN]: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Coaches & Students", icon: Users },
    { href: "/admin/batches", label: "Batches", icon: CalendarDays },
  ],
  [Role.TEACHER]: [
    { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/batches", label: "My Batches", icon: Users },
    { href: "/teacher/attendance", label: "Attendance", icon: CalendarDays },
    { href: "/teacher/availability", label: "Availability", icon: CalendarDays },
    { href: "/teacher/payouts", label: "Payouts", icon: LayoutDashboard },
  ],
  [Role.STUDENT]: [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
  ],
};
