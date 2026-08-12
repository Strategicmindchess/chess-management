import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { EmptyState } from "@/components/ui/empty-state";
import { getStudentDashboardData } from "@/actions/dashboard-actions";
import { getStudentAssignments } from "@/actions/assignment-actions";
import { ClassSessionCard } from "@/components/dashboard/class-session-card";
import { StudentAssignmentCard } from "@/components/dashboard/student-assignment-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function StudentMyClassesPage() {
  const user = await requireRole([Role.STUDENT]);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id }
  });

  if (!studentProfile) return <div>Student profile not found.</div>;

  const [dashboardData, assignmentData] = await Promise.all([
    getStudentDashboardData(studentProfile.id),
    getStudentAssignments(),
  ]);

  const { todayInstances, upcomingInstances } = dashboardData;
  const assignments = assignmentData.success ? assignmentData.data || [] : [];

  const { getISTNow } = await import("@/lib/timezone");
  const { getHours, getMinutes } = await import("date-fns");
  
  const istNow = getISTNow();
  const currentHour = getHours(istNow);
  const currentMin = getMinutes(istNow);

  const filteredTodayInstances = todayInstances.filter(instance => {
    // Keep cancelled classes visible for the entire day
    if (instance.status === 'CANCELLED') return true;
    
    const [endH, endM] = instance.endTime.split(":").map(Number);
    if (currentHour > endH || (currentHour === endH && currentMin >= endM)) {
      return false; // already ended
    }
    return true;
  });

  return (
    <div className="space-y-10 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Classroom
        </h1>
        <p className="text-slate-500 mt-1">
          Your enrolled batches, upcoming schedule, and assignments.
        </p>
      </div>

      <Tabs defaultValue="sessions" className="space-y-8">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="sessions" className="data-[state=active]:bg-slate-100">Sessions</TabsTrigger>
          <TabsTrigger value="assignments" className="data-[state=active]:bg-slate-100">
            Assignments {assignments.filter(a => a.status === 'PENDING').length > 0 && (
              <span className="ml-2 bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">
                {assignments.filter(a => a.status === 'PENDING').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-10 focus:outline-none">
          {/* Today's Classes */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Today's Sessions</h2>
            {filteredTodayInstances.length === 0 ? (
              <EmptyState
                title="No classes today"
                description="You don't have any classes scheduled for today, or they have already ended."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTodayInstances.map((instance) => (
                  <ClassSessionCard 
                    key={instance.id} 
                    role="student" 
                    session={instance} 
                    isUpcoming={false} 
                  />
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Classes */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Next 3 Days</h2>
            {upcomingInstances.length === 0 ? (
              <EmptyState
                title="No upcoming classes"
                description="You don't have any classes scheduled for the next 3 days."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80">
                {upcomingInstances.map((instance) => (
                  <ClassSessionCard 
                    key={instance.id} 
                    role="student" 
                    session={instance} 
                    isUpcoming={true} 
                  />
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="assignments" className="focus:outline-none">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Assignments</h2>
            {assignments.length === 0 ? (
              <EmptyState
                title="No assignments yet"
                description="Assignments will appear here 24 hours after your teacher marks a class as held."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {assignments.map((assignment) => (
                  <StudentAssignmentCard key={assignment.id} assignment={assignment} />
                ))}
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

