import { ExternalLink, Users, CalendarSync } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { startOfDay } from "date-fns";
import { ViewStudentsDialog } from "@/components/coach/view-students-dialog";
import { ViewScheduleDialog } from "@/components/coach/view-schedule-dialog";
import { StartBatchButton } from "@/components/coach/start-batch-button";

export default async function TeacherBatchesPage() {
  const user = await requireRole([Role.TEACHER]);

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id }
  });
  if (!coachProfile) return <div>Coach profile not found.</div>;

  const batches = await prisma.batch.findMany({
    where: { coachProfileId: coachProfile.id, isActive: true },
    include: {
      classInstances: {
        where: {
          date: { gte: startOfDay(new Date()) },
          status: "SCHEDULED"
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 3
      },
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

  const today = startOfDay(new Date());
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const filteredBatches = batches.map(batch => {
    const validInstances = batch.classInstances.filter(instance => {
      const instanceDate = new Date(instance.date);
      if (instanceDate > today) return true;
      const [endH, endM] = instance.endTime.split(":").map(Number);
      if (currentHour > endH || (currentHour === endH && currentMin >= endM)) {
        return false;
      }
      return true;
    });

    return {
      ...batch,
      classInstances: validInstances.slice(0, 3)
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">My Batches</h1>
        <p className="text-sm text-slate-500">
          View your assigned batches, access meet links, and manage your students.
        </p>
      </div>

      {filteredBatches.length === 0 ? (
        <EmptyState
          title="No batches assigned yet"
          description="Once an admin assigns you to a batch, it will show up here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBatches.map((batch) => {
            return (
              <Card key={batch.id} className="flex flex-col h-full border-slate-200 hover:shadow-md transition-shadow overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 flex justify-between items-start">
                  <h2 className="text-lg font-bold text-white">{batch.name}</h2>
                  <Badge variant="neutral" className="bg-white/20 text-white hover:bg-white/30 border-none">{batch.code}</Badge>
                </div>
                
                <CardContent className="p-0 flex flex-col h-full">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">Upcoming Sessions</span>
                  </div>

                  <div className="p-6 flex flex-col items-center justify-center flex-grow bg-white text-center">
                    <CalendarSync className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-700">
                      {batch.classInstances.length} Session{batch.classInstances.length !== 1 && "s"} Scheduled
                    </p>
                    {batch.classInstances.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        Next: {new Date(batch.classInstances[0].date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                    <div className="mt-4 w-full px-4">
                      <ViewScheduleDialog batchName={batch.name} classInstances={batch.classInstances} />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto space-y-3">
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
                            chessComRating: s.student.chessComRating,
                            lichessRating: s.student.lichessRating,
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
