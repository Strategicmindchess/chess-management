import { ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WEEKDAY_LABEL } from "@/lib/constants";

export default async function TeacherDashboardPage() {
  const user = await requireRole([Role.TEACHER]);

  const batches = await prisma.batch.findMany({
    where: { coachId: user.id, isActive: true },
    include: { schedules: { orderBy: { startTime: "asc" } }, students: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500">
          Your assigned batches are listed below.
        </p>
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
            <div className="divide-y divide-slate-100">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0"
                >
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
