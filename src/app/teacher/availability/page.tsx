import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { AvailabilityManager } from "@/components/coach/availability-manager";

export default async function TeacherAvailabilityPage() {
  const user = await requireRole([Role.TEACHER]);

  // Fetch coach profile and existing availability
  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    include: {
      availabilities: {
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
      }
    }
  });

  if (!coachProfile) {
    return <div>Coach profile not found. Please contact admin.</div>;
  }

  // Pass down the serialized availabilities to the client component
  const initialAvailabilities = coachProfile.availabilities.map(a => ({
    id: a.id,
    date: a.date.toISOString(),
    startTime: a.startTime,
    endTime: a.endTime,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Manage Availability</h1>
        <p className="text-sm text-slate-500">
          Select a date on the calendar to add your available time slots. You can also apply a time slot to the entire week.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <AvailabilityManager initialAvailabilities={initialAvailabilities} />
      </div>
    </div>
  );
}
