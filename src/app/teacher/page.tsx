import { ExternalLink, IndianRupee, Clock, CalendarDays } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WEEKDAY_LABEL } from "@/lib/constants";
import { AvailabilityEditor } from "@/components/teacher/availability-editor";
import { MarkClassHeldDialog } from "@/components/coach/mark-class-held-dialog";

export default async function TeacherDashboardPage() {
  const user = await requireRole([Role.TEACHER]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [batches, availabilities, monthlyLogs] = await Promise.all([
    prisma.batch.findMany({
      where: { coachId: user.id, isActive: true },
      include: {
        schedules: { orderBy: { startTime: "asc" } },
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                studentProfile: {
                  select: {
                    chessComId: true,
                    lichessId: true,
                    rating: true,
                  }
                }
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.coachAvailability.findMany({
      where: { coach: { userId: user.id } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      select: { dayOfWeek: true, startTime: true, endTime: true },
    }),
    prisma.classLog.aggregate({
      where: {
        coachId: user.id,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { payoutAmount: true, durationMins: true },
      _count: { id: true },
    })
  ]);

  const totalEarnings = monthlyLogs._sum.payoutAmount || 0;
  const totalClasses = monthlyLogs._count.id;
  const totalDuration = monthlyLogs._sum.durationMins || 0;
  const monthName = now.toLocaleString("default", { month: "long" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500">
          Manage your assigned batches and working hours.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle>My Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityEditor initialSlots={availabilities} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-brand-50/50 border-brand-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-brand-900">{monthName} Payout Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-4 shadow-sm border border-brand-100/50">
                <div className="flex items-center gap-2 text-brand-600 mb-2">
                  <IndianRupee className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Total Earned</p>
                </div>
                <p className="text-3xl font-bold text-brand-900">₹{totalEarnings.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-brand-100/50">
                <div className="flex items-center gap-2 text-brand-600 mb-2">
                  <CalendarDays className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Classes Held</p>
                </div>
                <p className="text-3xl font-bold text-brand-900">{totalClasses}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm border border-brand-100/50">
                <div className="flex items-center gap-2 text-brand-600 mb-2">
                  <Clock className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Minutes Taught</p>
                </div>
                <p className="text-3xl font-bold text-brand-900">{totalDuration}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My batches</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <EmptyState
              title="No batches assigned yet"
              description="Once an admin assigns you to a batch, it will show up here."
            />
          ) : (
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100 pr-2">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{batch.name}</p>
                      <Badge variant="neutral">{batch.code}</Badge>
                      <Badge variant="brand">
                        {batch.students.length} students
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {batch.schedules.map((slot) => (
                        <Badge key={slot.id} variant="neutral">
                          {WEEKDAY_LABEL[slot.day].slice(0, 3)} {slot.startTime}–
                          {slot.endTime}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <a
                        href={batch.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                      >
                        Join class <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <span className="text-slate-300">•</span>
                      <MarkClassHeldDialog 
                        batchId={batch.id} 
                        batchName={batch.name} 
                        students={batch.students.map((s) => ({
                          id: s.student.id,
                          name: s.student.name,
                        }))} 
                      />
                    </div>
                  </div>

                  {batch.students.length > 0 && (
                    <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Enrolled Students
                      </p>
                      <ul className="space-y-2">
                        {batch.students.map(({ student }) => (
                          <li
                            key={student.name}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            <span className="font-medium text-slate-700">
                              {student.name}
                            </span>
                            <div className="flex gap-3 text-slate-500 text-xs">
                              {student.studentProfile?.rating && (
                                <span>Rating: {student.studentProfile.rating}</span>
                              )}
                              {student.studentProfile?.chessComId && (
                                <span>Chess.com: {student.studentProfile.chessComId}</span>
                              )}
                              {student.studentProfile?.lichessId && (
                                <span>Lichess: {student.studentProfile.lichessId}</span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
