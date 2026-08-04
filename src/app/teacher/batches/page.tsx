import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { EmptyState } from "@/components/ui/empty-state";
import { getTeacherDashboardData } from "@/actions/dashboard-actions";
import { ClassSessionCard } from "@/components/dashboard/class-session-card";

export const dynamic = "force-dynamic";

export default async function TeacherBatchesPage() {
  const user = await requireRole([Role.TEACHER]);

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id }
  });
  if (!coachProfile) return <div>Coach profile not found.</div>;

  const { todayInstances, upcomingInstances } = await getTeacherDashboardData(coachProfile.id);

  // Filter out instances that have already ended today based on current time
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const filteredTodayInstances = todayInstances.filter(instance => {
    const [endH, endM] = instance.endTime.split(":").map(Number);
    if (currentHour > endH || (currentHour === endH && currentMin >= endM)) {
      return false; // already ended
    }
    return true;
  });

  return (
    <div className="space-y-10 max-w-7xl pb-12">
      {/* Today's Batches Section */}
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Today's Batches</h1>
          <p className="text-sm text-slate-500">
            View your assigned classes for today, access meet links, and manage your students.
          </p>
        </div>

        {filteredTodayInstances.length === 0 ? (
          <EmptyState
            title="No classes today"
            description="You don't have any classes scheduled for today, or they have already ended."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTodayInstances.map((instance) => (
              <ClassSessionCard 
                key={instance.id} 
                role="teacher" 
                session={instance} 
                isUpcoming={false} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Batches Section */}
      <div className="bg-slate-950 rounded-2xl p-6 md:p-8 space-y-6 shadow-lg border border-slate-900">
        <div>
          <h2 className="text-xl font-semibold text-white">Upcoming Batches (Next 3 Days)</h2>
          <p className="text-sm text-slate-400">
            Preview your scheduled classes for the upcoming 3 days.
          </p>
        </div>

        {upcomingInstances.length === 0 ? (
          <div className="bg-slate-900/50 rounded-xl p-8 text-center border border-slate-800">
            <h3 className="text-slate-200 font-medium mb-1">No upcoming classes</h3>
            <p className="text-slate-400 text-sm">You don't have any classes scheduled for the next 3 days.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingInstances.map((instance) => (
              <ClassSessionCard 
                key={instance.id} 
                role="teacher" 
                session={instance} 
                isUpcoming={true} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
