import {
  CalendarDays,
  LayoutDashboard,
  Users,
  IndianRupee,
  ClipboardCheck,
  Trophy,
  Activity,
  Wallet,
  Briefcase,
  MessageSquare,
  Gift,
  PlaySquare,
  Send,
  Shield,
  GraduationCap,
} from "lucide-react";
import { Role } from "@/lib/enums";

export interface NavSubItem {
  href: string;
  label: string;
  badge?: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  subItems?: NavSubItem[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: Record<Role, NavSection[]> = {
  [Role.ADMIN]: [
    {
      title: "Main",
      items: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Academics & Schedule",
      items: [
        {
          href: "/admin/today-classes",
          label: "Classes & Schedule",
          icon: CalendarDays,
          subItems: [
            { href: "/admin/today-classes", label: "Today's Classes", badge: "Live" },
            { href: "/admin/batches", label: "All Batches" },
            { href: "/admin/attendance/batch", label: "Attendance" },
          ],
        },
        { href: "/admin/courses", label: "Courses & Videos", icon: PlaySquare },
      ],
    },
    {
      title: "People & HR",
      items: [
        { href: "/admin/users", label: "Coaches & Students", icon: Users },
        { href: "/admin/employees", label: "Staff & Employees", icon: Briefcase },
      ],
    },
    {
      title: "Performance",
      items: [
        {
          href: "/admin/leaderboard",
          label: "Leaderboards",
          icon: Trophy,
          subItems: [
            { href: "/admin/leaderboard", label: "Student Leaderboard" },
            { href: "/admin/coach-leaderboard", label: "Coach Leaderboard" },
          ],
        },
        { href: "/admin/feedback", label: "Student Feedback", icon: MessageSquare },
      ],
    },
    {
      title: "Finance & Accounts",
      items: [
        {
          href: "/admin/fees",
          label: "Finance & Ledger",
          icon: Wallet,
          subItems: [
            { href: "/admin/fees", label: "Student Ledger" },
            { href: "/admin/payouts", label: "Coach & Staff Payouts" },
          ],
        },
      ],
    },
    {
      title: "Growth & Rewards",
      items: [
        {
          href: "/admin/referrals",
          label: "Rewards & Growth",
          icon: Gift,
          subItems: [
            { href: "/admin/referrals", label: "Referrals System" },
            { href: "/admin/chocolate", label: "Chocolate Rewards" },
          ],
        },
      ],
    },
    {
      title: "Operations & Tools",
      items: [
        { href: "/admin/tickets", label: "Support Tickets", icon: ClipboardCheck },
        {
          href: "/admin/communications",
          label: "Communications",
          icon: Send,
          subItems: [
            { href: "/admin/communications", label: "WhatsApp Broadcast" },
            { href: "/admin/communications/history", label: "Message History" },
          ],
        },
        { href: "/admin/data-sync", label: "Data Sync", icon: Activity },
      ],
    },
  ],

  [Role.TEACHER]: [
    {
      title: "Overview",
      items: [
        { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
        { href: "/teacher/batches", label: "Today's Batches", icon: Users },
      ],
    },
    {
      title: "Teaching & Schedule",
      items: [
        { href: "/teacher/attendance", label: "Attendance", icon: CalendarDays },
        { href: "/teacher/availability", label: "My Availability", icon: CalendarDays },
        { href: "/teacher/materials", label: "Class Materials", icon: ClipboardCheck },
        { href: "/teacher/courses", label: "Courses", icon: PlaySquare },
      ],
    },
    {
      title: "Performance & Payouts",
      items: [
        {
          href: "/teacher/leaderboard",
          label: "Leaderboards",
          icon: Trophy,
          subItems: [
            { href: "/teacher/leaderboard", label: "Student Leaderboard" },
            { href: "/teacher/coach-leaderboard", label: "Coach Leaderboard" },
          ],
        },
        { href: "/teacher/chocolate", label: "Chocolate Challenge", icon: Gift },
        { href: "/teacher/payouts", label: "My Payouts", icon: IndianRupee },
      ],
    },
    {
      title: "Support",
      items: [
        { href: "/teacher/tickets", label: "Support Tickets", icon: MessageSquare },
      ],
    },
  ],

  [Role.STUDENT]: [
    {
      title: "Learning Portal",
      items: [
        { href: "/student", label: "Dashboard", icon: LayoutDashboard },
        { href: "/student/my-classes", label: "My Classroom", icon: CalendarDays },
        { href: "/student/assignments", label: "Assignments", icon: GraduationCap },
        { href: "/student/courses", label: "Courses", icon: PlaySquare },
      ],
    },
    {
      title: "Progress & Community",
      items: [
        { href: "/student/leaderboard", label: "Leaderboard", icon: Trophy },
        { href: "/student/profile", label: "Student Passport", icon: Shield },
        { href: "/student/earn", label: "Earn with SMC", icon: Gift },
      ],
    },
    {
      title: "Support",
      items: [
        { href: "/student/tickets", label: "Support Tickets", icon: ClipboardCheck },
      ],
    },
  ],
};

// Flattened list for backward compatibility
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  [Role.ADMIN]: NAV_SECTIONS[Role.ADMIN].flatMap((s) => s.items),
  [Role.TEACHER]: NAV_SECTIONS[Role.TEACHER].flatMap((s) => s.items),
  [Role.STUDENT]: NAV_SECTIONS[Role.STUDENT].flatMap((s) => s.items),
};
