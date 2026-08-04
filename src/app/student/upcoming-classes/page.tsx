import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { EmptyState } from "@/components/ui/empty-state";
import { getStudentDashboardData } from "@/actions/dashboard-actions";
import { ClassSessionCard } from "@/components/dashboard/class-session-card";

export default async function StudentUpcomingClassesPage() {
  const user = await requireRole([Role.STUDENT]);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id }
  });

  if (!studentProfile) return <div>Student profile not found.</div>;

  const { upcomingInstances } = await getStudentDashboardData(studentProfile.id);

  return (
    <div className="space-y-10 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Upcoming Classes
        </h1>
        <p className="text-slate-500 mt-1">
          Your scheduled classes for the next 3 days.
        </p>
      </div>

      <section>
        {upcomingInstances.length === 0 ? (
          <EmptyState
            title="No upcoming classes"
            description="You don't have any classes scheduled for the next 3 days."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </div>
  );
}
