"use client";

import {
  CalendarDays, GraduationCap, UserCog, ArrowRight,
  Briefcase, MessageSquare, IndianRupee, AlertCircle, CheckCircle2,
  BookOpen, Clock, Loader2, PlusCircle, CreditCard, Receipt, FileText, PlayCircle
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import useSWR from "swr";

export function AdminDashboardClient({ userName }: { userName: string }) {
  const { data, isLoading, error } = useAdminDashboard();
  
  const { data: rescheduleData } = useSWR("/api/admin/reschedule-requests?status=PENDING", async (url) => {
    const res = await fetch(url);
    return res.json();
  });

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
  const firstName = userName.split(" ")[0];

  return (
    <div className="space-y-8 relative pb-10">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-screen" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold tracking-widest uppercase rounded-full mb-4">
            Admin Portal
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            Welcome back, <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{firstName}!</span> 👋
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            Here's an overview of your academy today.
          </p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-slate-300 font-medium">{format(new Date(), "EEE, d MMM yyyy")}</p>
          <p className="text-slate-500 text-sm">Better systems. Brighter minds.</p>
          <div className="h-0.5 w-full bg-gradient-to-l from-amber-400 to-transparent mt-2" />
        </div>
      </div>

      {/* Reschedule Requests Alert */}
      {rescheduleData?.pendingCount > 0 && (
        <div className="bg-[#2a1318]/80 backdrop-blur-xl border border-rose-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(244,63,94,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-start gap-3 relative z-10">
            <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-rose-400 font-bold text-base">Coach Reschedule Requests ({rescheduleData.pendingCount})</h3>
              <p className="text-rose-300/70 text-sm mt-0.5">
                Coaches have requested class reschedules. These require immediate management review.
              </p>
            </div>
          </div>
          <Link href="/admin/reschedule-requests" className="shrink-0 relative z-10">
            <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm font-semibold border border-rose-500">
              Review Requests
            </Button>
          </Link>
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Students */}
        <div className="group relative rounded-2xl bg-[#1a142c]/90 backdrop-blur-xl border border-purple-500/20 p-5 overflow-hidden hover:border-purple-500/50 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <GraduationCap className="w-5 h-5 text-purple-400" />
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium mb-1">Active Students</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-white">{studentCount}</p>
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-md border border-emerald-500/30 mb-1">↑ +12%</span>
          </div>
        </div>

        {/* Active Coaches */}
        <div className="group relative rounded-2xl bg-[#0f2a24]/90 backdrop-blur-xl border border-teal-500/20 p-5 overflow-hidden hover:border-teal-500/50 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
              <UserCog className="w-5 h-5 text-teal-400" />
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium mb-1">Active Coaches</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-white">{coachCount}</p>
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-md border border-emerald-500/30 mb-1">↑ +8%</span>
          </div>
        </div>

        {/* Active Batches */}
        <div className="group relative rounded-2xl bg-[#2a1c0f]/90 backdrop-blur-xl border border-amber-500/20 p-5 overflow-hidden hover:border-amber-500/50 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <CalendarDays className="w-5 h-5 text-amber-400" />
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium mb-1">Active Batches</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-white">{activeBatchCount}</p>
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-md border border-emerald-500/30 mb-1">↑ +5%</span>
          </div>
        </div>

        {/* Staff Members */}
        <div className="group relative rounded-2xl bg-[#2a0f18]/90 backdrop-blur-xl border border-pink-500/20 p-5 overflow-hidden hover:border-pink-500/50 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
              <Briefcase className="w-5 h-5 text-pink-400" />
            </div>
            <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium mb-1">Staff Members</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-white">{employeeCount}</p>
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-md border border-emerald-500/30 mb-1">↑ +0%</span>
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Operations Today */}
        <div className="group rounded-2xl bg-[#0f172a]/90 backdrop-blur-xl border border-blue-500/20 flex flex-col relative overflow-hidden hover:border-blue-500/50 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between p-6 border-b border-blue-500/20 relative z-10">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-bold text-white">Operations Today</h2>
            </div>
            <Link href="/admin/attendance" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="flex-1 divide-y divide-slate-800/50">
            <div className="p-4 hover:bg-slate-800/20 transition-colors flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Clock className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Today's Classes</p>
                  <p className="text-xs text-slate-500">Scheduled for today</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold text-lg">{todayClassCount}</span>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
              </div>
            </div>

            <div className="p-4 hover:bg-slate-800/20 transition-colors flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Open Tickets</p>
                  <p className="text-xs text-slate-500">Awaiting response</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold text-lg">{totalTickets}</span>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
              </div>
            </div>

            <div className="p-4 hover:bg-slate-800/20 transition-colors flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Pending Fees</p>
                  <p className="text-xs text-slate-500">Unpaid cycles</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold text-lg">{pendingFees}</span>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Payout Snapshot */}
        <div className="group rounded-2xl bg-[#1a142c]/90 backdrop-blur-xl border border-purple-500/20 flex flex-col relative overflow-hidden hover:border-purple-500/50 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between p-6 border-b border-purple-500/20 relative z-10">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5" />
            <div className="flex items-center gap-2 relative z-10">
              <IndianRupee className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Payout Snapshot — {currentMonthLabel}</h2>
            </div>
            <Link href="/admin/payouts" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium relative z-10">
              View Details <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="flex-1 divide-y divide-slate-800/50 p-6 flex flex-col justify-center space-y-4">
            
            <div className="bg-slate-900/50 rounded-xl p-4 flex items-center justify-between border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <UserCog className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Coach Payouts</p>
                  <p className="text-xs text-slate-500">(sessions billed)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">₹{coachGross.toLocaleString()}</span>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 flex items-center justify-between border border-slate-800 hover:border-slate-700 transition-colors mt-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                  <CalendarDays className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Staff Payroll</p>
                  <p className="text-xs text-slate-500">(net after TDS)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">₹{staffNet.toLocaleString()}</span>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </div>
            </div>

            <div className="bg-amber-500/10 rounded-xl p-4 flex items-center justify-between border border-amber-500/30 mt-4 shadow-[0_0_20px_rgba(245,158,11,0.1)] relative overflow-hidden">
               <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
               <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-300 font-medium text-sm">Total Estimated Outflow</p>
                  <p className="text-amber-400 text-2xl font-bold tracking-tight mt-1">₹{totalPayoutEstimate.toLocaleString()}</p>
                </div>
              </div>
              <Button className="bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30 relative z-10">
                View Payouts <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Total Outflow */}
        <div className="group rounded-2xl bg-[#2a1c0f]/90 backdrop-blur-xl border border-amber-500/30 p-6 flex flex-col relative overflow-hidden hover:border-amber-500/50 transition-colors shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/15 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between relative z-10 mb-8">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-bold text-white">Assignment Report</h2>
            </div>
            <Link href="/admin/assignment-report" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium">
              View Full Report <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="flex items-center justify-between px-8 py-6 flex-1 relative">
            <div className="absolute inset-0 border border-slate-800/50 rounded-xl" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-2">{summary.totalStudents}</p>
              <p className="text-sm text-slate-500">Total</p>
            </div>
            <div className="w-px h-16 bg-slate-800/80" />
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-400 mb-2">{summary.completedAll}</p>
              <p className="text-sm text-slate-500">Completed</p>
            </div>
            <div className="w-px h-16 bg-slate-800/80" />
            <div className="text-center">
              <p className="text-3xl font-bold text-rose-400 mb-2">{summary.missing}</p>
              <p className="text-sm text-slate-500">Missing</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="group rounded-2xl bg-[#0f2a24]/90 backdrop-blur-xl border border-teal-500/20 p-6 flex flex-col relative overflow-hidden hover:border-teal-500/50 transition-colors shadow-[0_4px_20px_rgba(20,184,166,0.15)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <PlayCircle className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <Link href="/admin/batches" className="group rounded-xl bg-emerald-950/30 border border-emerald-900/50 p-5 hover:bg-emerald-900/30 hover:border-emerald-500/50 transition-all flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">Add Batch</h3>
                  <p className="text-xs text-slate-400">Create a new batch</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <Link href="/admin/payouts" className="group rounded-xl bg-purple-950/30 border border-purple-900/50 p-5 hover:bg-purple-900/30 hover:border-purple-500/50 transition-all flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">View Payouts</h3>
                  <p className="text-xs text-slate-400">Check payments</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
