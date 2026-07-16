import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { startOfDay } from "date-fns";
import { JoinClassButton } from "@/components/student/join-class-button";

export default async function StudentMyClassesPage() {
  const user = await requireRole([Role.STUDENT]);

  const studentProfile = user.studentProfile;
  if (!studentProfile) return <div>Student profile not found.</div>;

  const today = startOfDay(new Date());

  const enrollments = await prisma.batchStudent.findMany({
    where: { studentProfileId: studentProfile.id, batch: { isActive: true } },
    include: {
      batch: {
        include: {
          coach: {
            include: {
              user: { select: { name: true } },
            },
          },
          classInstances: {
            where: {
              date: today,
              status: "SCHEDULED"
            },
            orderBy: [{ date: "asc" }, { startTime: "asc" }],
            take: 3 // show next 3 upcoming classes
          }
        },
      },
    },
    orderBy: { batch: { name: "asc" } },
  });

  // Filter out instances that have already ended today and just take the next 3 valid ones
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const filteredEnrollments = enrollments.map(enrollment => {
    const validInstances = enrollment.batch.classInstances.filter(instance => {
      const [endH, endM] = instance.endTime.split(":").map(Number);
      if (currentHour > endH || (currentHour === endH && currentMin >= endM)) {
        return false; // already ended
      }
      return true;
    });

    return {
      ...enrollment,
      batch: {
        ...enrollment.batch,
        classInstances: validInstances
      }
    };
  }).filter(enrollment => enrollment.batch.classInstances.length > 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Classes
        </h1>
        <p className="text-slate-500 mt-1">
          Your enrolled batches and upcoming schedule.
        </p>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          title="You're not enrolled in any batch yet"
          description="Once an admin enrolls you in a batch, it will show up here."
        />
      ) : filteredEnrollments.length === 0 ? (
        <EmptyState
          title="No classes today"
          description="You don't have any scheduled sessions remaining for today."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEnrollments.map(({ batch }) => (
            <Card key={batch.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-white">{batch.name}</h2>
                  <p className="text-brand-100 text-sm mt-0.5">
                    Coach: <span className="font-semibold">{batch.coach?.user?.name ?? "TBA"}</span>
                  </p>
                </div>
                <Badge variant="neutral" className="bg-white/20 text-white hover:bg-white/30 border-none">
                  {batch.code}
                </Badge>
              </div>
              
              <CardContent className="p-0">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Today's Sessions</span>
                  <JoinClassButton 
                    meetLink={batch.meetLink} 
                    nextInstance={batch.classInstances[0] || null} 
                  />
                </div>
                
                <div className="divide-y divide-slate-100">
                  {batch.classInstances.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">
                      No classes scheduled for today.
                    </div>
                  ) : (
                    batch.classInstances.map(instance => (
                      <div key={instance.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-brand-100 text-brand-700 p-2 rounded-lg">
                            <CalendarIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {new Date(instance.date).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center mt-0.5">
                              <Clock className="w-3 h-3 mr-1" />
                              {instance.startTime} - {instance.endTime}
                            </p>
                          </div>
                        </div>
                        <Badge variant="neutral" className="text-xs">Scheduled</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
