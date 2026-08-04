import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { MonthPicker } from "@/components/ui/month-picker";

export default async function TeacherPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireRole([Role.TEACHER]);
  const { month } = await searchParams;

  const parsedMonth = month ? month.split('-') : null;
  const selectedYear = parsedMonth ? parseInt(parsedMonth[0], 10) : new Date().getFullYear();
  const selectedMonth = parsedMonth ? parseInt(parsedMonth[1], 10) - 1 : new Date().getMonth();

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id }
  });
  if (!coachProfile) return <div>Coach profile not found.</div>;

  const classLogs = await prisma.classLog.findMany({
    where: { coachProfileId: coachProfile.id },
    include: {
      batch: { select: { id: true, name: true, code: true } },
      attendance: { select: { id: true } }, // just to get student count
    },
    orderBy: { date: "desc" },
  });

  const filteredLogs = classLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate.getFullYear() === selectedYear && logDate.getMonth() === selectedMonth;
  });

  const totalEarned = filteredLogs.reduce((acc, log) => acc + log.payoutAmount, 0);
  const totalClasses = filteredLogs.length;
  const totalMinutes = filteredLogs.reduce((acc, log) => acc + log.durationMins, 0);
  
  // Calculate unique batches taught
  const batchIds = new Set(filteredLogs.map(log => log.batchId));
  const totalBatchesTaught = batchIds.size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payouts & History</h1>
          <p className="text-sm text-slate-500">
            View your earnings and detailed history of classes taught for the selected month.
          </p>
        </div>
        <MonthPicker />
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
        {filteredLogs.length === 0 ? (
          <EmptyState
            title="No payout history"
            description="You haven't logged any classes for this month yet."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
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
