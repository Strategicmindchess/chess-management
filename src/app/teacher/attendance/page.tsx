import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkClassHeldDialog } from "@/components/coach/mark-class-held-dialog";
import { startOfDay } from "date-fns";

export default async function TeacherAttendancePage() {
  const user = await requireRole([Role.TEACHER]);

  // For a CRM used in India, ideally use IST or configurable tz.
  // For simplicity, we use server local time, but warn if timezones mismatch.
  const today = startOfDay(new Date());

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id }
  });
  if (!coachProfile) return <div>Coach profile not found.</div>;

  // Get all un-marked class instances for this coach up to today
  const pendingInstances = await prisma.classInstance.findMany({
    where: {
      batch: { coachProfileId: coachProfile.id, isActive: true },
      date: { lte: today },
      status: "SCHEDULED"
    },
    include: {
      batch: {
        include: {
          students: {
            include: {
              student: {
                include: {
                  user: { select: { id: true, name: true, email: true } }
                }
              }
            }
          }
        }
      }
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }]
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Today's Attendance</h1>
        <p className="text-sm text-slate-500">
          Mark attendance for classes held today. You can only submit attendance after the class finishes.
        </p>
      </div>

      {pendingInstances.length === 0 ? (
        <EmptyState
          title="All caught up!"
          description="You don't have any pending classes to mark attendance for."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingInstances.map((instance) => {
            const batch = instance.batch;
            const dateStr = new Date(instance.date).toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' });
            
            return (
              <Card key={instance.id} className="flex flex-col h-full">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-lg font-bold text-slate-900">{batch.name}</h2>
                    <Badge variant="neutral">{batch.code}</Badge>
                  </div>
                  
                  <div className="text-sm text-slate-600 mb-6 flex-grow">
                    <p className="font-medium text-slate-800">Class Session</p>
                    {/* @ts-ignore */}
                    {instance.lectureName && (
                      <p className="text-brand-700 font-semibold mt-1 mb-1">
                        {/* @ts-ignore */}
                        📖 {instance.lectureName}
                      </p>
                    )}
                    <p>{dateStr}</p>
                    <p>{instance.startTime} - {instance.endTime}</p>
                  </div>

                  <div className="mt-auto">
                    <MarkClassHeldDialog 
                      batchId={instance.id} // We pass instance.id to the MarkClassHeldDialog
                      batchName={batch.name}
                      students={batch.students.map(s => ({ id: s.student.id, name: s.student.user.name }))}
                      scheduleStartTime={instance.startTime}
                      scheduleEndTime={instance.endTime}
                      // @ts-ignore
                      lectureName={instance.lectureName}
                    />
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
