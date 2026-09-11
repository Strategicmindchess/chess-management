import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { MonthPicker } from "@/components/ui/month-picker";
import { toZonedTime } from "date-fns-tz";

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
  const monthString = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    include: {
      payoutAdjustments: { where: { month: monthString }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!coachProfile) return <div>Coach profile not found.</div>;

  const classLogs = await prisma.classLog.findMany({
    where: { coachProfileId: coachProfile.id },
    include: {
      batch: { select: { id: true, name: true, code: true } },
      attendance: { select: { id: true } },
    },
    orderBy: { date: "desc" },
  });

  const filteredLogs = classLogs.filter(log => {
    const logDate = toZonedTime(log.date, 'Asia/Kolkata');
    return logDate.getFullYear() === selectedYear && logDate.getMonth() === selectedMonth;
  });

  const grossEarned = filteredLogs.reduce((acc, log) => acc + log.payoutAmount, 0);
  const totalPenalties = filteredLogs.reduce((acc, log) => {
    if (!log.penaltyWaived) return acc + (log.penaltyAmount ?? 0);
    return acc;
  }, 0);
  const totalAdjustments = coachProfile.payoutAdjustments.reduce((acc, a) => acc + a.amount, 0);
  const beforeTds = grossEarned - totalPenalties + totalAdjustments;
  const tdsAmount = coachProfile.tdsApplicable ? Math.round(beforeTds * 0.1) : 0;
  const netPayout = beforeTds - tdsAmount;

  const totalClasses = filteredLogs.length;
  const totalMinutes = filteredLogs.reduce((acc, log) => acc + log.durationMins, 0);
  const batchIds = new Set(filteredLogs.map(log => log.batchId));
  const totalBatchesTaught = batchIds.size;

  // Batch-wise breakdown
  const batchMap = new Map<string, { name: string; code: string; sessions: number; payout: number; penalties: number }>();
  for (const log of filteredLogs) {
    if (!batchMap.has(log.batchId)) {
      batchMap.set(log.batchId, { name: log.batch.name, code: log.batch.code, sessions: 0, payout: 0, penalties: 0 });
    }
    const b = batchMap.get(log.batchId)!;
    b.sessions++;
    b.payout += log.payoutAmount;
    if (!log.penaltyWaived) b.penalties += log.penaltyAmount ?? 0;
  }
  const batchBreakdown = Array.from(batchMap.values()).sort((a, b) => b.payout - a.payout);

  const ADJ_COLORS: Record<string, string> = { BONUS: "text-emerald-600", INCENTIVE: "text-blue-600", DEDUCTION: "text-rose-600" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payouts & History</h1>
          <p className="text-sm text-slate-500">
            Your earnings breakdown for the selected month.
            {coachProfile.tdsApplicable && <span className="ml-2 text-amber-600 font-medium">TDS 10% applicable</span>}
          </p>
        </div>
        <MonthPicker />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Gross Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">₹{grossEarned.toLocaleString()}</div>
          </CardContent>
        </Card>
        {totalPenalties > 0 && (
          <Card className="border-rose-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-rose-500">Penalties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">−₹{totalPenalties.toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
        {tdsAmount > 0 && (
          <Card className="border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">TDS (10%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">−₹{tdsAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">Net Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">₹{netPayout.toLocaleString()}</div>
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
            <div className="text-2xl font-bold text-slate-900">{(totalMinutes / 60).toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalBatchesTaught}</div>
          </CardContent>
        </Card>
      </div>

      {/* Net Payout breakdown */}
      <Card>
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Payout Calculation</h2>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="flex justify-between text-slate-700">
            <span>Gross ({totalClasses} classes)</span>
            <span className="font-semibold">₹{grossEarned.toLocaleString()}</span>
          </div>
          {totalPenalties > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Penalties deducted</span>
              <span className="font-semibold">−₹{totalPenalties.toLocaleString()}</span>
            </div>
          )}
          {totalAdjustments !== 0 && (
            <div className={`flex justify-between ${totalAdjustments >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              <span>Adjustments</span>
              <span className="font-semibold">{totalAdjustments >= 0 ? "+" : ""}₹{totalAdjustments.toLocaleString()}</span>
            </div>
          )}
          {tdsAmount > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>TDS deducted (10%)</span>
              <span className="font-semibold">−₹{tdsAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-3">
            <span>Net Payout</span>
            <span className="text-emerald-700 text-lg">₹{netPayout.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Adjustments */}
      {coachProfile.payoutAdjustments.length > 0 && (
        <Card>
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Adjustments this Month</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {coachProfile.payoutAdjustments.map(adj => (
              <div key={adj.id} className="p-4 flex justify-between items-start">
                <div>
                  <span className={`text-xs font-semibold uppercase ${ADJ_COLORS[adj.type] ?? "text-slate-600"}`}>{adj.type}</span>
                  <p className="text-sm text-slate-600 mt-0.5">{adj.reason}</p>
                </div>
                <span className={`font-semibold ${adj.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {adj.amount >= 0 ? "+" : ""}₹{adj.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Batch-wise breakdown */}
      {batchBreakdown.length > 0 && (
        <Card>
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Batch-wise Breakdown</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {batchBreakdown.map(b => (
              <div key={b.code} className="p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{b.name}</p>
                    <Badge variant="neutral">{b.code}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{b.sessions} sessions</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-700">₹{b.payout.toLocaleString()}</p>
                  {b.penalties > 0 && <p className="text-xs text-rose-500">−₹{b.penalties} penalty</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Class History */}
      <Card>
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Class History</h2>
        </div>
        {filteredLogs.length === 0 ? (
          <EmptyState
            title="No payout history"
            description="You haven't logged any classes for this month yet."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{log.batch.name}</h3>
                      <Badge variant="neutral">{log.batch.code}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-1.5">
                      Topic: <span className="font-medium text-slate-800">{log.topicCovered}</span>
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{new Date(log.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
                      <span>•</span>
                      <span>{log.durationMins} mins</span>
                      <span>•</span>
                      <span>{log.attendance.length} students marked</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="success" className="text-sm px-3 py-1">
                      +₹{log.payoutAmount}
                    </Badge>
                    {(log.penaltyAmount ?? 0) > 0 && (
                      <Badge variant={log.penaltyWaived ? "neutral" : "danger"} className="text-sm px-3 py-1">
                        {log.penaltyWaived ? "Waived" : `−₹${log.penaltyAmount}`}
                      </Badge>
                    )}
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

