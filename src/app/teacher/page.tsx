import { ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WEEKDAY_LABEL } from "@/lib/constants";
import { AvailabilityEditor } from "@/components/teacher/availability-editor";

export default async function TeacherDashboardPage() {
  const user = await requireRole([Role.TEACHER]);

  const [batches, availabilities] = await Promise.all([
    prisma.batch.findMany({
      where: { coachId: user.id, isActive: true },
      include: {
        schedules: { orderBy: { startTime: "asc" } },
        students: {
          include: {
            student: {
              select: {
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
    })
  ]);

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

      <Card>
        <CardHeader>
          <CardTitle>My Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityEditor initialSlots={availabilities} />
        </CardContent>
      </Card>

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
                    <a
                      href={batch.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                    >
                      Join class <ExternalLink className="h-3.5 w-3.5" />
                    </a>
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

      <Card>
        <CardContent className="text-sm text-slate-600">
          More coach tools — attendance logging, payouts, availability, and
          feedback — are coming in the next modules.
        </CardContent>
      </Card>
    </div>
  );
}
