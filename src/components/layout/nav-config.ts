import { CalendarDays, LayoutDashboard, Users, IndianRupee, ClipboardCheck, Trophy } from "lucide-react";
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
    { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/admin/tickets", label: "Support Tickets", icon: ClipboardCheck },
    { href: "/admin/attendance/batch", label: "Attendance", icon: ClipboardCheck },
    { href: "/admin/payouts", label: "Payouts", icon: IndianRupee },
    //{ href: "/admin/materials", label: "Class Materials", icon: ClipboardCheck },
  ],
  [Role.TEACHER]: [
    { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/batches", label: "Today's Batches", icon: Users },
    { href: "/teacher/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/teacher/attendance", label: "Attendance", icon: CalendarDays },
    { href: "/teacher/availability", label: "Availability", icon: CalendarDays },
    { href: "/teacher/payouts", label: "Payouts", icon: LayoutDashboard },
    { href: "/teacher/materials", label: "Class Materials", icon: ClipboardCheck },
  ],
  [Role.STUDENT]: [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/my-classes", label: "My Classroom", icon: CalendarDays },
    { href: "/student/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/student/tickets", label: "Support Tickets", icon: ClipboardCheck },
    { href: "/student/profile", label: "Profile", icon: Users },
  ],
};
