import { prisma } from "@/lib/prisma";
import { getISTDayBounds } from "@/lib/timezone";
import { CalendarDays, ArrowRight, Users, Video } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JoinClassButton } from "./join-class-button";
import { NotifyStudentsButton } from "@/components/coach/notify-students-button";

export async function TodayBatches({ coachUserId }: { coachUserId: string }) {
  const { today, tomorrow } = getISTDayBounds();

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: coachUserId },
  });

  if (!coachProfile) {
    return <div className="text-slate-500">Coach profile not found.</div>;
  }

  const todaysClasses = await prisma.classInstance.findMany({
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
          students: {
            include: {
              student: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return (
    <div className="group rounded-2xl bg-white dark:bg-[#1a142c]/90 backdrop-blur-xl border border-slate-200/90 dark:border-purple-500/20 p-6 flex flex-col relative overflow-hidden shadow-xs hover:shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-purple-300 dark:hover:border-purple-500/50 transition-all h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[30px] -mr-10 -mt-10 pointer-events-none" />
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Today's Batches</h2>
        </div>
        <Link href="/teacher/batches" className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 font-semibold">
          View All <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3 flex-1 flex flex-col justify-start relative z-10">
        {todaysClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-slate-500 dark:text-slate-400 font-medium">No classes scheduled for today.</p>
          </div>
        ) : (
          todaysClasses.map((cls) => {
            const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            const isLive = nowTime >= cls.startTime && nowTime <= cls.endTime;
            const isPast = nowTime > cls.endTime;

            return (
              <div key={cls.id} className={`bg-slate-50/80 hover:bg-slate-100/70 dark:bg-slate-900/50 dark:hover:bg-slate-900/80 border ${isLive ? 'border-emerald-300 dark:border-emerald-500/30 shadow-xs dark:shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-slate-200/80 dark:border-slate-800'} rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors`}>
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isLive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                    : isPast
                      ? 'bg-slate-200/80 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30'
                    }`}>
                    {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />}
                    {isLive ? 'Live' : isPast ? 'Past' : 'Upcoming'}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 font-medium">{cls.startTime} – {cls.endTime}</p>
                    <p className="text-slate-900 dark:text-white font-semibold">{cls.batch.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5" /> {cls.batch.students.length} Students
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <NotifyStudentsButton
                    classInstanceId={cls.id}
                    batchId={cls.batchId}
                    batchName={cls.batch.name}
                    batchCode={cls.batch.code}
                    meetLink={cls.batch.meetLink}
                    students={cls.batch.students.map((bs) => ({
                      id: bs.student.id,
                      name: bs.student.user?.name || bs.student.parentName || 'Student',
                      phone: bs.student.user?.phone || bs.student.parentPhone || '',
                    }))}
                    initialReminderSentAt={(cls as any).reminderSentAt ?? null}
                    startTime={cls.startTime}
                    endTime={cls.endTime}
                    isToday={true}
                    isCancelled={cls.status === 'CANCELLED'}
                  />
                  {cls.batch.meetLink ? (
                    <JoinClassButton meetLink={cls.batch.meetLink} classInstanceId={cls.id} />
                  ) : (
                    <Button variant="secondary" className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 w-full sm:w-auto cursor-not-allowed">
                      No Link
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function TodayBatchesSkeleton() {
  return (
    <div className="group rounded-2xl bg-white dark:bg-[#1a142c]/90 backdrop-blur-xl border border-slate-200 dark:border-purple-500/20 p-6 flex flex-col relative overflow-hidden shadow-xs h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-brand-400/50" />
          <h2 className="text-lg font-bold text-slate-400 dark:text-white/50">Today's Batches</h2>
        </div>
      </div>
      <div className="space-y-3 flex-1">
        {[1, 2].map((i) => (
          <div key={i} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-16 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="space-y-2">
                <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            </div>
            <div className="w-24 h-10 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
