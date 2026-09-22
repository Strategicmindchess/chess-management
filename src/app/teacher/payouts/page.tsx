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

  const ADJ_COLORS: Record<string, string> = { BONUS: "text-emerald-400", INCENTIVE: "text-blue-400", DEDUCTION: "text-rose-400" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Payouts & History</h1>
          <p className="text-sm text-slate-400">
            Your earnings breakdown for the selected month.
            {coachProfile.tdsApplicable && <span className="ml-2 text-amber-500 font-medium">TDS 10% applicable</span>}
          </p>
        </div>
        <MonthPicker />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Gross Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₹{grossEarned.toLocaleString()}</div>
          </CardContent>
        </Card>
        {totalPenalties > 0 && (
          <Card className="border-rose-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-rose-400">Penalties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-500">−₹{totalPenalties.toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
        {tdsAmount > 0 && (
          <Card className="border-amber-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-500">TDS (10%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">−₹{tdsAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
        <Card className="border-emerald-800/50 bg-emerald-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-400">Net Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">₹{netPayout.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Classes Held</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalClasses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Hours Taught</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{(totalMinutes / 60).toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalBatchesTaught}</div>
          </CardContent>
        </Card>
      </div>

      {/* Net Payout breakdown */}
      <Card>
        <div className="p-5 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-white">Payout Calculation</h2>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="flex justify-between text-slate-300">
            <span>Gross ({totalClasses} classes)</span>
            <span className="font-semibold text-white">₹{grossEarned.toLocaleString()}</span>
          </div>
          {totalPenalties > 0 && (
            <div className="flex justify-between text-rose-400">
              <span>Penalties (deducted)</span>
              <span className="font-semibold">−₹{totalPenalties.toLocaleString()}</span>
            </div>
          )}
          {coachProfile.payoutAdjustments.filter((a: any) => a.month === monthString).map((adj: any) => (
            <div key={adj.id} className={`flex justify-between ${ADJ_COLORS[adj.type] || "text-slate-400"}`}>
              <span>{adj.type === "DEDUCTION" ? "Deduction" : "Bonus"}: {adj.reason}</span>
              <span className="font-semibold">
                {adj.type === "DEDUCTION" ? "−" : "+"}₹{adj.amount.toLocaleString()}
              </span>
            </div>
          ))}
          {tdsAmount > 0 && (
            <div className="flex justify-between text-amber-500">
              <span>TDS (10%)</span>
              <span className="font-semibold">−₹{tdsAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-emerald-400 text-base pt-3 border-t border-slate-700/50 mt-3 font-bold">
            <span>Net Transferrable</span>
            <span>₹{netPayout.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Class History */}
      <Card>
        <div className="p-5 border-b border-slate-700/50 flex justify-between items-center">
          <h2 className="text-base font-semibold text-white">Class History</h2>
          <Badge variant="neutral">{filteredLogs.length} Sessions</Badge>
        </div>
        <div className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No classes logged for this month.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors flex justify-between items-center">
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                      {log.batch.name}
                      <span className="text-xs bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">{log.batch.code}</span>
                    </div>
                    <div className="text-sm text-slate-400 mt-0.5">
                      {new Date(log.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {" • "}
                      {log.durationMins} mins
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">₹{log.payoutAmount.toLocaleString()}</div>
                    {log.penaltyAmount && log.penaltyAmount > 0 ? (
                      <div className={`flex flex-col items-end gap-0.5 mt-0.5 ${log.penaltyWaived ? "text-slate-400 line-through" : "text-rose-400"}`}>
                        <div className="text-xs font-medium">−₹{log.penaltyAmount} penalty</div>
                        {log.penaltyNote && (
                          <div 
                            className="text-[11px] opacity-80 max-w-[200px] sm:max-w-[300px] text-right truncate" 
                            title={log.penaltyNote}
                          >
                            {log.penaltyNote}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Batch Breakdown Table */}
      <Card>
        <div className="p-5 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-white">Batch-wise Earnings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800/50 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Batch</th>
                <th className="px-4 py-3 font-medium text-center">Sessions</th>
                <th className="px-4 py-3 font-medium text-right">Penalties</th>
                <th className="px-4 py-3 font-medium text-right">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {batchBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No data available.</td>
                </tr>
              ) : (
                batchBreakdown.map(b => (
                  <tr key={b.code} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{b.name}</div>
                      <div className="text-xs text-slate-400">{b.code}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{b.sessions}</td>
                    <td className="px-4 py-3 text-right">
                      {b.penalties > 0 ? <span className="text-rose-400">−₹{b.penalties}</span> : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">₹{b.payout.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
