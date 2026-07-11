import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role, Weekday } from "@/lib/enums";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkClassHeldDialog } from "@/components/coach/mark-class-held-dialog";

function getJsDayToEnum(jsDay: number): Weekday {
  const map: Record<number, Weekday> = {
    0: Weekday.SUNDAY,
    1: Weekday.MONDAY,
    2: Weekday.TUESDAY,
    3: Weekday.WEDNESDAY,
    4: Weekday.THURSDAY,
    5: Weekday.FRIDAY,
    6: Weekday.SATURDAY,
  };
  return map[jsDay];
}

export default async function TeacherAttendancePage() {
  const user = await requireRole([Role.TEACHER]);

  // For a CRM used in India, ideally use IST or configurable tz.
  // For simplicity, we use server local time, but warn if timezones mismatch.
  const today = new Date();
  const currentWeekday = getJsDayToEnum(today.getDay());

  // Get all batches for this coach that have a schedule TODAY
  const batches = await prisma.batch.findMany({
    where: {
      coachId: user.id,
      isActive: true,
      schedules: {
        some: { day: currentWeekday }
      }
    },
    include: {
      schedules: {
        where: { day: currentWeekday }
      },
      students: {
        include: {
          student: { select: { id: true, name: true, email: true } }
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Today's Attendance</h1>
        <p className="text-sm text-slate-500">
          Mark attendance for classes held today. You can only submit attendance after the class finishes.
        </p>
      </div>

      {batches.length === 0 ? (
        <EmptyState
          title="No classes scheduled for today"
          description="You don't have any batches scheduled for this day of the week."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => {
            // There should be exactly 1 schedule matched for today
            const schedule = batch.schedules[0];
            const timeString = schedule ? `${schedule.startTime} - ${schedule.endTime}` : "Unknown time";
            
            return (
              <Card key={batch.id} className="flex flex-col h-full">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-lg font-bold text-slate-900">{batch.name}</h2>
                    <Badge variant="neutral">{batch.code}</Badge>
                  </div>
                  
                  <div className="text-sm text-slate-600 mb-6">
                    <p className="font-medium text-slate-800">Today's Schedule</p>
                    <p>{timeString}</p>
                  </div>

                  <div className="mt-auto">
                    {schedule && (
                      <MarkClassHeldDialog 
                        batchId={batch.id}
                        batchName={batch.name}
                        students={batch.students.map(s => s.student)}
                        scheduleStartTime={schedule.startTime}
                        scheduleEndTime={schedule.endTime}
                      />
                    )}
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
