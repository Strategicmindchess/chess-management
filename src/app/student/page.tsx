import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { Trophy, Zap, Swords, Target, GraduationCap, CalendarDays, ArrowRight, Users, ListTodo, Activity } from "lucide-react";
import Image from "next/image";
import { getStudentAssignments } from "@/actions/assignment-actions";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getStudentDashboardData } from "@/actions/dashboard-actions";
import { formatClassTiming, getClassDateLabel, isClassLive, isClassPast } from "@/lib/timezone";
import { getStudentChocolateStatus } from "@/actions/chocolate-actions";
import { StudentChocolateCard } from "@/components/student/chocolate-card";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requireRole([Role.STUDENT]);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id }
  });

  if (!studentProfile) {
    return <div className="p-6 text-white">Profile not found.</div>;
  }

  const [assignmentsData, dashboardData, chocolateStatus] = await Promise.all([
    getStudentAssignments() as any,
    getStudentDashboardData(studentProfile.id),
    getStudentChocolateStatus()
  ]);

  const progress = assignmentsData.success && assignmentsData.progress
    ? assignmentsData.progress
    : { total: 0, score: 0, percentage: 0 };

  const { todayInstances, upcomingInstances } = dashboardData;

  const filteredTodayInstances = todayInstances.filter(instance => {
    if (instance.status === 'CANCELLED') return true;
    return !isClassPast(instance.date, instance.endTime);
  });

  const displayInstances = [...filteredTodayInstances, ...upcomingInstances].slice(0, 4);

  const practiceCards = [
    {
      title: "Tactical Race",
      description: "Race to solve the most puzzles in 1 minute on Lichess",
      url: "https://lichess.org/racer",
      icon: Trophy,
      glowColor: "bg-orange-500/10 dark:bg-orange-500/30",
      iconBg: "bg-orange-50 border-orange-200 dark:bg-orange-500/20 dark:border-orange-500/30",
      iconColor: "text-orange-600 dark:text-orange-400",
      borderColor: "border-orange-200 dark:border-orange-500/50",
      hoverBorder: "hover:border-orange-400 dark:hover:border-orange-400",
      shadowColor: "shadow-xs dark:shadow-[0_0_30px_rgba(249,115,22,0.2)]",
      hoverShadow: "hover:shadow-md dark:hover:shadow-[0_0_40px_rgba(249,115,22,0.4)]",
      arrowBg: "bg-orange-100 text-orange-700 dark:bg-orange-500/40 dark:text-white",
      arrowHoverBg: "group-hover:bg-orange-600 group-hover:text-white dark:group-hover:bg-orange-500",
      tag: "Puzzle Racer",
    },
    {
      title: "Tactical Blitz",
      description: "Puzzle Storm! Solve puzzles quickly before time runs out",
      url: "https://lichess.org/storm",
      icon: Zap,
      glowColor: "bg-violet-500/10 dark:bg-violet-500/30",
      iconBg: "bg-violet-50 border-violet-200 dark:bg-violet-500/20 dark:border-violet-500/30",
      iconColor: "text-violet-600 dark:text-violet-400",
      borderColor: "border-violet-200 dark:border-violet-500/50",
      hoverBorder: "hover:border-violet-400 dark:hover:border-violet-400",
      shadowColor: "shadow-xs dark:shadow-[0_0_30px_rgba(139,92,246,0.2)]",
      hoverShadow: "hover:shadow-md dark:hover:shadow-[0_0_40px_rgba(139,92,246,0.4)]",
      arrowBg: "bg-violet-100 text-violet-700 dark:bg-violet-500/40 dark:text-white",
      arrowHoverBg: "group-hover:bg-violet-600 group-hover:text-white dark:group-hover:bg-violet-500",
      tag: "Puzzle Storm",
    },
    {
      title: "Solve Puzzles",
      description: "Improve your tactical vision with rating-targeted puzzles",
      url: "https://lichess.org/training",
      icon: Target,
      glowColor: "bg-pink-500/10 dark:bg-pink-500/30",
      iconBg: "bg-pink-50 border-pink-200 dark:bg-pink-500/20 dark:border-pink-500/30",
      iconColor: "text-pink-600 dark:text-pink-400",
      borderColor: "border-pink-200 dark:border-pink-500/50",
      hoverBorder: "hover:border-pink-400 dark:hover:border-pink-400",
      shadowColor: "shadow-xs dark:shadow-[0_0_30px_rgba(236,72,153,0.2)]",
      hoverShadow: "hover:shadow-md dark:hover:shadow-[0_0_40px_rgba(236,72,153,0.4)]",
      arrowBg: "bg-pink-100 text-pink-700 dark:bg-pink-500/40 dark:text-white",
      arrowHoverBg: "group-hover:bg-pink-600 group-hover:text-white dark:group-hover:bg-pink-500",
      tag: "Puzzles",
    },
    {
      title: "Play Game",
      description: "Play a live game online against players on Chess.com",
      url: "https://www.chess.com/play/online",
      icon: Swords,
      glowColor: "bg-emerald-500/10 dark:bg-emerald-500/30",
      iconBg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-500/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-200 dark:border-emerald-500/50",
      hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-400",
      shadowColor: "shadow-xs dark:shadow-[0_0_30px_rgba(16,185,129,0.2)]",
      hoverShadow: "hover:shadow-md dark:hover:shadow-[0_0_40px_rgba(16,185,129,0.4)]",
      arrowBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/40 dark:text-white",
      arrowHoverBg: "group-hover:bg-emerald-600 group-hover:text-white dark:group-hover:bg-emerald-500",
      tag: "Live Game",
    },
  ];

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6 relative pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <span className="inline-block px-3 py-1 bg-brand-50 dark:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30 text-brand-700 dark:text-brand-300 text-xs font-bold tracking-widest uppercase rounded-full mb-3 shadow-xs">
            Student Classroom
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back,<br />
            <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-amber-600 dark:from-brand-300 dark:via-brand-400 dark:to-orange-400 bg-clip-text text-transparent font-extrabold">{firstName}!</span> 👋
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm md:text-base">
            Track your classes, submit feedback, or practice your chess skills below.
          </p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-slate-700 dark:text-slate-300 font-semibold">{format(new Date(), "EEE, d MMM yyyy")}</p>
          <p className="text-slate-500 text-sm">Small steps. Big rating gains.</p>
          <div className="h-0.5 w-16 bg-gradient-to-l from-brand-500 to-transparent ml-auto mt-2" />
        </div>
      </div>

      {/* Top Row: Practice Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {practiceCards.map((card) => {
          const Icon = card.icon;
          return (
            <a
              key={card.title}
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-[#11141c]/60 backdrop-blur-2xl border ${card.borderColor} p-5 transition-all duration-300 hover:-translate-y-1 ${card.hoverBorder} ${card.shadowColor} ${card.hoverShadow} flex flex-col justify-between`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[30px] -mr-8 -mt-8 pointer-events-none ${card.glowColor}`} />

              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3 relative z-10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg} border shadow-xs`}>
                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ml-auto shadow-xs ${card.arrowBg} ${card.arrowHoverBg}`}>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                <p className={`text-[11px] font-bold tracking-wider uppercase mb-1 relative z-10 ${card.iconColor}`}>
                  {card.tag}
                </p>

                <h3 className="font-bold text-slate-900 dark:text-white text-lg relative z-10">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed relative z-10">
                  {card.description}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      {/* Middle Row: Assignment Progress */}
      <div className="rounded-2xl bg-white dark:bg-[#11141c]/50 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700/50 p-6 flex flex-col relative overflow-hidden shadow-xs hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] mt-8 group hover:border-slate-300 dark:hover:border-slate-600 transition-all">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[50px] pointer-events-none -z-10 group-hover:bg-brand-500/20 transition-colors duration-500" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/20 border border-brand-200/60 dark:border-brand-500/30 flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assignment Progress</h2>
          </div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Completed: <span className="text-slate-900 dark:text-white font-bold">{progress.score} / {progress.total}</span>
          </div>
        </div>

        <div className="relative z-10 py-4 flex items-center">
          <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden relative shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-amber-500 dark:from-brand-600 dark:via-brand-400 dark:to-yellow-300 rounded-full shadow-sm animate-[pulse_2s_ease-in-out_infinite]"
              style={{ width: `${progress.total > 0 ? progress.percentage : 0}%` }}
            />
          </div>
          {progress.total > 0 && (
            <div className="absolute -translate-y-1/2 top-1/2 left-0 transform transition-all" style={{ left: `calc(${progress.percentage}% - 24px)` }}>
              <div className="bg-white dark:bg-[#11141c] border-2 border-brand-500 dark:border-brand-400 rounded-full text-xs font-bold text-brand-700 dark:text-brand-400 px-2 py-0.5 shadow-sm">
                {Math.round(progress.percentage)}%
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 relative z-10">
          Keep going! Consistency leads to rating improvement.
        </p>
      </div>

      {/* Chocolate Challenge Card */}
      {chocolateStatus && (
        <div className="mt-6">
          <StudentChocolateCard status={chocolateStatus} />
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">

        {/* Left Column: Classes (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-[#11141c]/50 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700/50 p-6 flex flex-col relative overflow-hidden shadow-xs hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none -z-10" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-brand-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Today &amp; Upcoming Classes</h2>
            </div>
            <Link href="/student/my-classes" className="text-sm text-brand-600 hover:text-brand-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 font-semibold">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3 flex-1 relative z-10">
            {displayInstances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <CalendarDays className="w-10 h-10 mb-3 opacity-30" />
                <p className="font-medium text-sm">No upcoming classes in the next 3 days.</p>
              </div>
            ) : (
              displayInstances.map((instance, idx) => {
                const isLive = instance.status !== 'CANCELLED' && isClassLive(instance.date, instance.startTime, instance.endTime);
                const dateLabel = getClassDateLabel(instance.date);

                return (
                  <div key={instance.id} className="bg-slate-50/80 hover:bg-slate-100/70 dark:bg-slate-900/50 dark:hover:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                    <div className="flex items-center gap-3">
                      {instance.status === 'CANCELLED' ? (
                        <div className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-red-500/20 dark:text-red-400 text-xs font-bold border border-rose-200 dark:border-red-500/30">
                          Cancelled
                        </div>
                      ) : isLive ? (
                        <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />
                          Live
                        </div>
                      ) : (
                        <div className="px-3 py-1 rounded-full bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700">
                          {dateLabel}
                        </div>
                      )}

                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 font-medium">{formatClassTiming(instance.startTime, instance.endTime)}</p>
                        <p className="text-slate-900 dark:text-white font-semibold">{instance.batch.name} ({instance.batch.code})</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-medium">
                          Coach {instance.batch.coach?.user?.name || "Unassigned"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {instance.status !== 'CANCELLED' && (
                        <a
                          href={instance.batch.meetLink || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 sm:flex-none font-bold px-4 py-2 rounded-lg flex items-center justify-center transition-all ${isLive
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                              : "bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                            }`}
                        >
                          Join Class <ArrowRight className="w-4 h-4 ml-2" />
                        </a>
                      )}
                      <Link href="/student/my-classes" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors">
                        <span className="font-bold flex leading-none mt-[-4px]">...</span>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#11141c]/50 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700/50 p-6 flex flex-col relative overflow-hidden shadow-xs hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none -z-10" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <Zap className="w-5 h-5 text-brand-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 relative z-10">
            <Link href="/student/assignments" className="group rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200/90 dark:bg-blue-900/50 dark:border-blue-400 p-4 shadow-xs hover:shadow-md dark:shadow-[0_0_30px_rgba(59,130,246,0.4)] dark:hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] dark:hover:bg-blue-800/60 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/30 rounded-full blur-[30px] pointer-events-none" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shadow-xs">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white dark:bg-blue-500 flex items-center justify-center shrink-0 shadow-xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-slate-900 dark:text-white font-bold mb-1">Solve Assignments</h3>
                <p className="text-xs text-slate-600 dark:text-blue-200/70">Complete your pending assignments and improve your skills.</p>
              </div>
            </Link>

            <Link href="/student/leaderboard" className="group rounded-xl bg-gradient-to-br from-purple-50 to-pink-50/60 border border-purple-200/90 dark:bg-purple-900/50 dark:border-purple-400 p-4 shadow-xs hover:shadow-md dark:shadow-[0_0_30px_rgba(168,85,247,0.4)] dark:hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] dark:hover:bg-purple-800/60 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/30 rounded-full blur-[30px] pointer-events-none" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center shadow-xs">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white dark:bg-purple-500 flex items-center justify-center shrink-0 shadow-xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-slate-900 dark:text-white font-bold mb-1">Check Leaderboard</h3>
                <p className="text-xs text-slate-600 dark:text-purple-200/70">See your ranking and track your progress.</p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
