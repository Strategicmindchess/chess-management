import { ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WEEKDAY_LABEL } from "@/lib/constants";

export default async function StudentDashboardPage() {
  const user = await requireRole([Role.STUDENT]);

  const [userWithProfile, enrollments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: { studentProfile: { select: { chessComId: true, lichessId: true, rating: true, city: true } } },
    }),
    prisma.batchStudent.findMany({
    where: { studentId: user.id, batch: { isActive: true } },
    include: {
      batch: {
        include: {
          coach: { select: { name: true } },
          schedules: { orderBy: { startTime: "asc" } },
        },
      },
    },
    orderBy: { batch: { name: "asc" } },
    }),
  ]);

  const studentDetails = userWithProfile?.studentProfile;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500">
          Your enrolled batches are listed below.
        </p>
      </div>

      {studentDetails && (
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-slate-500">City</p>
                <p className="font-medium text-slate-900">{studentDetails.city || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Rating</p>
                <p className="font-medium text-slate-900">{studentDetails.rating ?? "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Chess.com</p>
                <p className="font-medium text-slate-900">{studentDetails.chessComId || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Lichess</p>
                <p className="font-medium text-slate-900">{studentDetails.lichessId || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>My classes</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <EmptyState
              title="You're not enrolled in any batch yet"
              description="Once an admin enrolls you in a batch, it will show up here."
            />
          ) : (
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100 pr-2">
              {enrollments.map(({ batch }) => (
                <div
                  key={batch.id}
                  className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{batch.name}</p>
                    <Badge variant="neutral">{batch.code}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    Coach:{" "}
                    <span className="font-medium text-slate-700">
                      {batch.coach?.name ?? "To be announced"}
                    </span>
                  </p>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="text-sm text-slate-600">
          Fee status, feedback forms, and ticket support will be added in
          upcoming modules.
        </CardContent>
      </Card>
    </div>
  );
}
