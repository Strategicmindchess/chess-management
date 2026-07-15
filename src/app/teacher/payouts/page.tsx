import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default async function TeacherPayoutsPage() {
  const user = await requireRole([Role.TEACHER]);

  const coachProfile = user.coachProfile;
  if (!coachProfile) return <div>Coach profile not found.</div>;

  const classLogs = await prisma.classLog.findMany({
    where: { coachProfileId: coachProfile.id },
    include: {
      batch: { select: { id: true, name: true, code: true } },
      attendance: { select: { id: true } }, // just to get student count
    },
    orderBy: { date: "desc" },
  });

  const totalEarned = classLogs.reduce((acc, log) => acc + log.payoutAmount, 0);
  const totalClasses = classLogs.length;
  const totalMinutes = classLogs.reduce((acc, log) => acc + log.durationMins, 0);
  
  // Calculate unique batches taught
  const batchIds = new Set(classLogs.map(log => log.batchId));
  const totalBatchesTaught = batchIds.size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Payouts & History</h1>
        <p className="text-sm text-slate-500">
          View your total earnings and detailed history of classes taught.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">₹{totalEarned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Classes Held</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalClasses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Hours Taught</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {(totalMinutes / 60).toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Batches Taught</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalBatchesTaught}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Class History</h2>
        </div>
        {classLogs.length === 0 ? (
          <EmptyState
            title="No payout history"
            description="You haven't logged any classes yet."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {classLogs.map((log) => (
              <div key={log.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{log.batch.name}</h3>
                      <Badge variant="neutral">{log.batch.code}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      Topic: <span className="font-medium text-slate-800">{log.topicCovered}</span>
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                      <span>{new Date(log.date).toLocaleDateString("en-GB", { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>{log.durationMins} mins</span>
                      <span>•</span>
                      <span>{log.attendance.length} Students Present/Marked</span>
                    </div>
                  </div>
                  <div className="flex items-center sm:items-start">
                    <Badge variant="success" className="text-sm px-3 py-1">
                      + ₹{log.payoutAmount}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
