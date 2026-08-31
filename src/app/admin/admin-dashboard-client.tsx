"use client";

import {
  CalendarDays, GraduationCap, UserCog, ArrowRight,
  Briefcase, MessageSquare, IndianRupee, AlertCircle, CheckCircle2,
  BookOpen, Clock, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";

export function AdminDashboardClient({ userName }: { userName: string }) {
  const { data, isLoading, error } = useAdminDashboard();

  if (error) {
    return <div className="text-red-500">Failed to load admin dashboard stats.</div>;
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const { stats, summary } = data;

  const {
    studentCount, coachCount, activeBatchCount, employeeCount,
    pendingStudentTickets, pendingCoachTickets,
    pendingFees, todayClassCount,
    monthString, coachGross, staffNet, totalPayoutEstimate,
  } = stats;

  const totalTickets = pendingStudentTickets + pendingCoachTickets;
  const currentMonthLabel = format(new Date(`${monthString}-01`), "MMMM yyyy");

  // ── Stat card definitions ──────────────────────────────────────────────────
  const primaryStats = [
    {
      label: "Active Students",
      value: studentCount,
      icon: GraduationCap,
      href: "/admin/users",
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Active Coaches",
      value: coachCount,
      icon: UserCog,
      href: "/admin/users",
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Active Batches",
      value: activeBatchCount,
      icon: CalendarDays,
      href: "/admin/batches",
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Staff Members",
      value: employeeCount,
      icon: Briefcase,
      href: "/admin/employees",
      color: "text-orange-600 bg-orange-50",
    },
  ];

  const operationalStats = [
    {
      label: "Today's Classes",
      value: todayClassCount,
      icon: Clock,
      href: "/admin/attendance/batch",
      color: todayClassCount > 0 ? "text-blue-700 bg-blue-50" : "text-slate-500 bg-slate-50",
      suffix: "scheduled",
    },
    {
      label: "Open Tickets",
      value: totalTickets,
      icon: MessageSquare,
      href: "/admin/tickets",
      color: totalTickets > 0 ? "text-amber-700 bg-amber-50" : "text-slate-500 bg-slate-50",
      sub: totalTickets > 0 ? `${pendingStudentTickets} students · ${pendingCoachTickets} coaches` : "All clear",
    },
    {
      label: "Pending Fees",
      value: pendingFees,
      icon: AlertCircle,
      href: "/admin/fees",
      color: pendingFees > 0 ? "text-rose-700 bg-rose-50" : "text-slate-500 bg-slate-50",
      suffix: "cycles unpaid",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Welcome back, {userName.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {format(new Date(), "EEEE, d MMMM yyyy")} · SMC Admin Portal
        </p>
      </div>

      {/* Primary stats — People */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Academy Overview</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {primaryStats.map(stat => (
            <Link key={stat.label} href={stat.href}>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Operational stats + Payout row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Operational */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Operations Today</p>
          <div className="space-y-3">
            {operationalStats.map(stat => (
              <Link key={stat.label} href={stat.href}>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                      {"suffix" in stat && stat.suffix && (
                        <span className="text-xs text-slate-400">{stat.suffix}</span>
                      )}
                    </div>
                    {"sub" in stat && stat.sub && (
                      <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Payout snapshot */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Payout Snapshot — {currentMonthLabel}
          </p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="space-y-3">
              {[
                {
                  label: "Coach Payouts (sessions billed)",
                  value: coachGross,
                  color: "text-blue-700",
                  bg: "bg-blue-50",
                  icon: UserCog,
                },
                {
                  label: "Staff Payroll (net after TDS)",
                  value: staffNet,
                  color: "text-purple-700",
                  bg: "bg-purple-50",
                  icon: Briefcase,
                },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${row.bg} ${row.color} flex-shrink-0`}>
                    <row.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">{row.label}</p>
                    <p className={`font-bold text-base ${row.color}`}>₹{row.value.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Estimated Outflow</p>
                <p className="text-2xl font-bold text-slate-900">₹{totalPayoutEstimate.toLocaleString()}</p>
              </div>
              <Link href={`/admin/payouts?month=${monthString}`}>
                <button className="text-xs px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5" /> View Payouts
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row — Assignment report + Quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Assignment report */}
        <Card className="lg:col-span-1">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-600" />
              Assignment Report
            </h2>
          </div>
          <CardContent className="pt-5">
            <div className="grid grid-cols-3 gap-3 text-center mb-5">
              <div>
                <div className="text-xl font-bold text-slate-900">{summary.totalStudents}</div>
                <div className="text-xs text-slate-500 mt-0.5">Total</div>
              </div>
              <div>
                <div className="text-xl font-bold text-emerald-600">{summary.completedAll}</div>
                <div className="text-xs text-slate-500 mt-0.5">Completed</div>
              </div>
              <div>
                <div className="text-xl font-bold text-rose-600">{summary.missing}</div>
                <div className="text-xs text-slate-500 mt-0.5">Missing</div>
              </div>
            </div>
            <Link href="/admin/assignment-report" className="block w-full">
              <Button variant="secondary" className="w-full flex items-center justify-between text-sm">
                <span>View Full Report</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card className="lg:col-span-2">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
          </div>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Add Batch", href: "/admin/batches", icon: CalendarDays, color: "text-emerald-600 bg-emerald-50" },
                { label: "Student Ledger", href: "/admin/fees", icon: IndianRupee, color: "text-blue-600 bg-blue-50" },
                { label: "View Payouts", href: "/admin/payouts", icon: IndianRupee, color: "text-purple-600 bg-purple-50" },
                { label: "Attendance", href: "/admin/attendance/batch", icon: CheckCircle2, color: "text-teal-600 bg-teal-50" },
                { label: "Support Tickets", href: "/admin/tickets", icon: MessageSquare, color: "text-amber-600 bg-amber-50" },
                { label: "Employees", href: "/admin/employees", icon: Briefcase, color: "text-orange-600 bg-orange-50" },
              ].map(link => (
                <Link key={link.label} href={link.href}>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer bg-white group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${link.color}`}>
                      <link.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{link.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
