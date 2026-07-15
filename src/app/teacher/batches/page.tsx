import { ExternalLink, Users, CalendarSync } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WEEKDAY_LABEL } from "@/lib/constants";
import { ViewStudentsDialog } from "@/components/coach/view-students-dialog";
import { StartBatchButton } from "@/components/coach/start-batch-button";

export default async function TeacherBatchesPage() {
  const user = await requireRole([Role.TEACHER]);

  const coachProfile = user.coachProfile;
  if (!coachProfile) return <div>Coach profile not found.</div>;

  const batches = await prisma.batch.findMany({
    where: { coachProfileId: coachProfile.id, isActive: true },
    include: {
      schedules: { orderBy: { startTime: "asc" } },
      students: {
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">My Batches</h1>
        <p className="text-sm text-slate-500">
          View your assigned batches, access meet links, and manage your students.
        </p>
      </div>

      {batches.length === 0 ? (
        <EmptyState
          title="No batches assigned yet"
          description="Once an admin assigns you to a batch, it will show up here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => {
            const uniqueDays = Array.from(new Set(batch.schedules.map((s) => s.day)));
            const daysString = uniqueDays.map((d) => WEEKDAY_LABEL[d]).join(", ");
            const timeString = batch.schedules.length > 0
              ? `${batch.schedules[0].startTime} - ${batch.schedules[0].endTime}`
              : "No schedule";

            return (
              <Card key={batch.id} className="flex flex-col h-full">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-lg font-bold text-slate-900">{batch.name}</h2>
                    <Badge variant="neutral">{batch.code}</Badge>
                  </div>
                  
                  <div className="text-sm text-slate-600 mb-4 flex-grow">
                    <p className="font-medium text-slate-800">{daysString}</p>
                    <p>{timeString}</p>
                  </div>

                  <div className="space-y-3 mt-auto">
                    <StartBatchButton meetLink={batch.meetLink} batchName={batch.name} />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <ViewStudentsDialog 
                        batchName={batch.name}
                        students={batch.students.map((s) => ({
                          id: s.student.id,
                          name: s.student.user.name,
                          email: s.student.user.email,
                          phone: s.student.user.phone,
                          studentProfile: {
                            chessComId: s.student.chessComId,
                            lichessId: s.student.lichessId,
                            rating: s.student.rating,
                            city: s.student.city,
                            parentName: s.student.parentName,
                            parentPhone: s.student.parentPhone,
                          },
                        }))}
                      />
                      <Button variant="secondary" size="sm" className="w-full text-xs">
                        <CalendarSync className="mr-1 h-3.5 w-3.5" />
                        Reschedule
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
