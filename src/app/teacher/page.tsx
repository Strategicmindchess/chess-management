import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { getAssignmentReport } from "@/actions/assignment-actions";
import { Users, CheckCircle2, AlertCircle, FileText, CalendarDays, BookOpen, Clock, Activity, Flag, Puzzle, ArrowRight, PlayCircle, PlusCircle, ShieldAlert, Gift } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { TodayBatches, TodayBatchesSkeleton } from "./today-batches";
import { DashboardNotifyDialog } from "@/components/coach/dashboard-notify-dialog";
import { prisma } from "@/lib/prisma";
import { getISTDayBounds } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const user = await requireRole([Role.TEACHER]);
  const reportData = await getAssignmentReport() as any;
  const summary = reportData.success && reportData.summary
    ? reportData.summary
    : { totalStudents: 0, completedAll: 0, missing: 0 };

  const firstName = user.name.split(" ")[0];

  // Fetch coach profile & today's classes for Quick Notify
  const { today, tomorrow } = getISTDayBounds();
  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
  });

  const todaysClasses = coachProfile
    ? await prisma.classInstance.findMany({
        where: {
          OR: [
            { coachProfileId: coachProfile.id },
            { coachProfileId: null, batch: { coachProfileId: coachProfile.id, isActive: true } }
          ],
          date: { gte: today, lt: tomorrow },
          status: "SCHEDULED",
        } as any,
        include: {
          batch: {
            include: {
              students: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
      })
    : [];

  const formattedClasses = todaysClasses.map((c) => ({
    id: c.id,
    batchId: c.batchId,
    batchName: c.batch.name,
    batchCode: c.batch.code,
    startTime: c.startTime,
    endTime: c.endTime,
    studentCount: c.batch.students.length,
    reminderSentAt: c.reminderSentAt,
    status: c.status,
  }));

  return (
    <div className="space-y-8 relative pb-10">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-screen" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold tracking-widest uppercase rounded-full mb-3 shadow-xs">
            Coach Dashboard
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Good afternoon, <span className="text-amber-600 dark:text-amber-400 font-extrabold">{firstName}!</span> 👋
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm md:text-base">
            Here's your teaching overview.
          </p>
          <div className="h-0.5 w-24 bg-gradient-to-r from-amber-500 to-transparent mt-3" />
        </div>
        <div className="text-right hidden md:block">
          <p className="text-slate-700 dark:text-slate-300 font-semibold">{format(new Date(), "EEE, d MMM yyyy")}</p>
          <p className="text-slate-500 text-sm">Plan. Teach. Inspire. Repeat.</p>
          <div className="h-0.5 w-full bg-gradient-to-l from-brand-500 to-transparent mt-2" />
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="group relative rounded-2xl bg-white dark:bg-[#141521]/80 backdrop-blur-xl border border-indigo-100 dark:border-indigo-500/20 p-5 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all shadow-xs hover:shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-500/30 shadow-xs">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-1">Total Students</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{summary.totalStudents}</p>
        </div>

        {/* Assignments Completed */}
        <div className="group relative rounded-2xl bg-white dark:bg-[#121a18]/80 backdrop-blur-xl border border-emerald-100 dark:border-emerald-500/20 p-5 overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all shadow-xs hover:shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-500/30 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-1">Assignments Completed</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{summary.completedAll}</p>
        </div>

        {/* Assignments Missing — links to assignment report */}
        <Link href="/teacher/assignment-report" className="group relative rounded-2xl bg-white dark:bg-[#211416]/80 backdrop-blur-xl border border-rose-100 dark:border-rose-500/20 p-5 overflow-hidden hover:border-rose-300 dark:hover:border-rose-500/50 transition-all shadow-xs hover:shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] block">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center border border-rose-200/60 dark:border-rose-500/30 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-1">Assignments Missing</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{summary.missing}</p>
        </Link>

        {/* Compliance & Penalties — opens policy page (not availability) */}
        <Link href="/teacher/policy" className="group relative rounded-2xl bg-white dark:bg-[#111723]/80 backdrop-blur-xl border border-blue-100 dark:border-blue-500/20 p-5 overflow-hidden hover:border-blue-300 dark:hover:border-blue-500/50 transition-all shadow-xs hover:shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] block">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center border border-blue-200/60 dark:border-blue-500/30 shadow-xs">
              <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-1">Compliance &amp; Penalties</p>
          <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold">View Policy →</p>
        </Link>
      </div>

      {/* SMC CLASS FLOW */}
      <div className="group relative rounded-2xl bg-white dark:bg-[#2a1c0f]/90 backdrop-blur-xl border border-amber-200/80 dark:border-amber-500/20 p-6 shadow-xs hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden hover:border-amber-300 dark:hover:border-amber-500/50 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-rose-500/5 pointer-events-none" />

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/20 flex items-center justify-center border border-amber-200/80 dark:border-amber-500/30 shadow-xs">
              <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-slate-400 uppercase tracking-wider mb-0.5">SMC Class Flow</p>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your Class Structure</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Follow this structure in every SMC class for maximum impact.</p>
            </div>
          </div>
          <Link href="/teacher/guide" className="hidden sm:block">
            <Button variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-amber-500/20 font-semibold">
              <BookOpen className="w-4 h-4 mr-2" />
              View Full Guide <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Timeline Flow */}
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center mt-12 mb-6 px-4 z-10 gap-8 sm:gap-0">
          {/* Connecting Line (Desktop) */}
          <div className="hidden sm:block absolute top-6 left-[5%] right-[5%] h-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />

          {/* Step 1 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center shadow-xs dark:shadow-[0_0_20px_rgba(245,158,11,0.4)] z-10 relative">
              <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-4">
              <p className="text-amber-600 dark:text-amber-400 font-bold">2 min</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Welcome &amp;<br />Assignment</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center shadow-xs dark:shadow-[0_0_20px_rgba(59,130,246,0.4)] z-10 relative">
              <PlayCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-4">
              <p className="text-blue-600 dark:text-blue-400 font-bold">5–7 min</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Revision</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-xs dark:shadow-[0_0_20px_rgba(16,185,129,0.4)] z-10 relative">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-4">
              <p className="text-emerald-600 dark:text-emerald-400 font-bold">10–15 min</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Concept<br />Explanation</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center shadow-xs dark:shadow-[0_0_20px_rgba(168,85,247,0.4)] z-10 relative">
              <Puzzle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mt-4">
              <p className="text-purple-600 dark:text-purple-400 font-bold">15–20 min</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Student Puzzles</p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center shadow-xs dark:shadow-[0_0_20px_rgba(249,115,22,0.4)] z-10 relative">
              <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="mt-4">
              <p className="text-orange-600 dark:text-orange-400 font-bold">5–10 min</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Game Analysis</p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flex flex-col items-center text-center relative w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center shadow-xs dark:shadow-[0_0_20px_rgba(244,63,94,0.4)] z-10 relative">
              <Flag className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="mt-4">
              <p className="text-rose-600 dark:text-rose-400 font-bold">2 min</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Closing</p>
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
        <div className="group rounded-2xl bg-white dark:bg-[#0f2a24]/90 backdrop-blur-xl border border-slate-200/80 dark:border-teal-500/20 p-6 flex flex-col relative overflow-hidden shadow-xs hover:shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-teal-300 dark:hover:border-teal-500/50 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <PlayCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <DashboardNotifyDialog classes={formattedClasses} />
            <Link href="/teacher/attendance" className="group rounded-xl bg-emerald-50/70 border border-emerald-200/90 dark:bg-emerald-950/30 dark:border-emerald-900/50 p-5 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30 dark:hover:border-emerald-500/50 transition-all flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-slate-900 dark:text-white font-bold mb-1">Take Attendance</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Mark today's class attendance</p>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            <Link href="/teacher/availability" className="group rounded-xl bg-purple-50/70 border border-purple-200/90 dark:bg-purple-950/30 dark:border-purple-900/50 p-5 hover:bg-purple-100/70 dark:hover:bg-purple-900/30 dark:hover:border-purple-500/50 transition-all flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center mb-4 shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-slate-900 dark:text-white font-bold mb-1">Mark Availability</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Set your availability for upcoming classes</p>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-xs">
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
        className="group relative rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 dark:from-[#1a1311]/90 dark:to-[#1a1f2e]/80 backdrop-blur-xl border border-amber-200/90 dark:border-amber-500/30 p-6 flex items-center gap-5 overflow-hidden shadow-xs hover:shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-amber-300 dark:hover:border-amber-500/60 transition-all"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center border border-amber-200 dark:border-amber-500/30 shrink-0 shadow-xs group-hover:shadow-md transition-shadow">
          <span className="text-2xl">🍫</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400/70 uppercase tracking-widest mb-1">Monthly Challenge</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chocolate Challenge</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Award +5 / −2 marks to students for class question answers.
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:border-amber-600 transition-all shadow-xs">
          <ArrowRight className="w-5 h-5 text-amber-700 dark:text-amber-400 group-hover:text-white transition-colors" />
        </div>
      </Link>
    </div>
  );
}
