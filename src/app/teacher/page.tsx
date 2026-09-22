import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { getAssignmentReport } from "@/actions/assignment-actions";
import { Users, CheckCircle2, AlertCircle, FileText, CalendarDays, BookOpen, Clock, Activity, Flag, Puzzle, ArrowRight, PlayCircle, PlusCircle, ShieldAlert, Gift } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { TodayBatches, TodayBatchesSkeleton } from "./today-batches";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const user = await requireRole([Role.TEACHER]);
  const reportData = await getAssignmentReport() as any;
  const summary = reportData.success && reportData.summary 
    ? reportData.summary 
    : { totalStudents: 0, completedAll: 0, missing: 0 };

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-8 relative pb-10">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-screen" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Coach Dashboard</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
            Good afternoon, <span className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">{firstName}!</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            Here's your teaching overview.
          </p>
          <div className="h-0.5 w-24 bg-gradient-to-r from-amber-400 to-transparent mt-4" />
        </div>
        <div className="text-right hidden md:block">
          <p className="text-slate-300 font-medium">{format(new Date(), "EEE, d MMM yyyy")}</p>
          <p className="text-slate-500 text-sm">Plan. Teach. Inspire. Repeat.</p>
          <div className="h-0.5 w-full bg-gradient-to-l from-brand-500 to-transparent mt-2" />
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="group relative rounded-2xl bg-[#141521]/80 backdrop-blur-xl border border-indigo-500/20 p-5 overflow-hidden hover:border-indigo-500/50 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <p className="text-sm text-slate-400 font-medium mb-1">Total Students</p>
          <p className="text-3xl font-bold text-white">{summary.totalStudents}</p>
        </div>

        {/* Assignments Completed */}
        <div className="group relative rounded-2xl bg-[#121a18]/80 backdrop-blur-xl border border-emerald-500/20 p-5 overflow-hidden hover:border-emerald-500/50 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <p className="text-sm text-slate-400 font-medium mb-1">Assignments Completed</p>
          <p className="text-3xl font-bold text-white">{summary.completedAll}</p>
        </div>

        {/* Assignments Missing — links to assignment report */}
        <Link href="/teacher/assignment-report" className="group relative rounded-2xl bg-[#211416]/80 backdrop-blur-xl border border-rose-500/20 p-5 overflow-hidden hover:border-rose-500/50 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.3)] block">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
          </div>
          <p className="text-sm text-slate-400 font-medium mb-1">Assignments Missing</p>
          <p className="text-3xl font-bold text-white">{summary.missing}</p>
        </Link>

        {/* Compliance & Penalties — opens policy page (not availability) */}
        <Link href="/teacher/policy" className="group relative rounded-2xl bg-[#111723]/80 backdrop-blur-xl border border-blue-500/20 p-5 overflow-hidden hover:border-blue-500/50 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.3)] block">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <ShieldAlert className="w-5 h-5 text-blue-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
          </div>
          <p className="text-sm text-slate-400 font-medium mb-1">Compliance &amp; Penalties</p>
          <p className="text-blue-400 text-sm font-medium">View Policy →</p>
        </Link>
      </div>

      {/* SMC CLASS FLOW */}
      <div className="group relative rounded-2xl bg-[#2a1c0f]/90 backdrop-blur-xl border border-amber-500/20 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden hover:border-amber-500/50 transition-colors">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-rose-500/5 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">SMC Class Flow</p>
              <h2 className="text-xl font-bold text-white">Your Class Structure</h2>
              <p className="text-sm text-slate-500 mt-1">Follow this structure in every SMC class for maximum impact.</p>
            </div>
          </div>
          <Link href="/teacher/guide" className="hidden sm:block">
            <Button variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
              <BookOpen className="w-4 h-4 mr-2" />
              View Full Guide <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Timeline Flow */}
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center mt-12 mb-6 px-4 z-10 gap-8 sm:gap-0">
          {/* Connecting Line (Desktop) */}
          <div className="hidden sm:block absolute top-6 left-[5%] right-[5%] h-0.5 bg-slate-800 -z-10" />
          
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] z-10 relative bg-[#11141c]">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div className="mt-4">
              <p className="text-amber-400 font-bold">2 min</p>
              <p className="text-sm text-slate-300 font-medium">Welcome &<br/>Assignment</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] z-10 relative bg-[#11141c]">
              <PlayCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div className="mt-4">
              <p className="text-blue-400 font-bold">5–7 min</p>
              <p className="text-sm text-slate-300 font-medium">Revision</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] z-10 relative bg-[#11141c]">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-4">
              <p className="text-emerald-400 font-bold">10–15 min</p>
              <p className="text-sm text-slate-300 font-medium">Concept<br/>Explanation</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] z-10 relative bg-[#11141c]">
              <Puzzle className="w-5 h-5 text-purple-400" />
            </div>
            <div className="mt-4">
              <p className="text-purple-400 font-bold">15–20 min</p>
              <p className="text-sm text-slate-300 font-medium">Student Puzzles</p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)] z-10 relative bg-[#11141c]">
              <Activity className="w-5 h-5 text-orange-400" />
            </div>
            <div className="mt-4">
              <p className="text-orange-400 font-bold">5–10 min</p>
              <p className="text-sm text-slate-300 font-medium">Game Analysis</p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.4)] z-10 relative bg-[#11141c]">
              <Flag className="w-5 h-5 text-rose-400" />
            </div>
            <div className="mt-4">
              <p className="text-rose-400 font-bold">2 min</p>
              <p className="text-sm text-slate-300 font-medium">Closing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Today's Batches (dynamic data with loading state) */}
        <Suspense fallback={<TodayBatchesSkeleton />}>
          <TodayBatches coachUserId={user.id} />
        </Suspense>

        {/* Quick Actions */}
        <div className="group rounded-2xl bg-[#0f2a24]/90 backdrop-blur-xl border border-teal-500/20 p-6 flex flex-col relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-teal-500/50 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <PlayCircle className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-white">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <Link href="/teacher/attendance" className="group rounded-xl bg-emerald-950/30 border border-emerald-900/50 p-5 hover:bg-emerald-900/30 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold mb-1">Take Attendance</h3>
                <p className="text-sm text-slate-400">Mark today's class attendance</p>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            <Link href="/teacher/availability" className="group rounded-xl bg-purple-950/30 border border-purple-900/50 p-5 hover:bg-purple-900/30 hover:border-purple-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-white font-bold mb-1">Mark Availability</h3>
                <p className="text-sm text-slate-400">Set your availability for upcoming classes</p>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>
        </div>

      </div>

      {/* Chocolate Challenge — Quick Link card */}
      <Link
        href="/teacher/chocolate"
        className="group relative rounded-2xl bg-gradient-to-br from-[#1a1311]/90 to-[#1a1f2e]/80 backdrop-blur-xl border border-amber-500/30 p-6 flex items-center gap-5 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-amber-500/60 transition-all hover:shadow-[0_0_40px_rgba(245,158,11,0.12)]"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.15)] group-hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-shadow">
          <span className="text-2xl">🍫</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-400/70 uppercase tracking-widest mb-1">Monthly Challenge</p>
          <h2 className="text-xl font-bold text-white">Chocolate Challenge</h2>
          <p className="text-sm text-slate-400 mt-1">
            Award +5 / −2 marks to students for class question answers.
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:border-amber-400 transition-all">
          <ArrowRight className="w-5 h-5 text-amber-400 group-hover:text-white transition-colors" />
        </div>
      </Link>
    </div>
  );
}
