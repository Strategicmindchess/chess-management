import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { MonthPicker } from "@/components/ui/month-picker";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

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

  const [yearStr, monthStrPart] = monthString.split("-");
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStrPart, 10) - 1;
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();

  const startDate = fromZonedTime(`${yearStr}-${monthStrPart}-01 00:00:00`, "Asia/Kolkata");
  const endDate = fromZonedTime(`${yearStr}-${monthStrPart}-${lastDay} 23:59:59.999`, "Asia/Kolkata");

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    include: {
      payoutAdjustments: { where: { month: monthString }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!coachProfile) return <div>Coach profile not found.</div>;

  const filteredLogs = await prisma.classLog.findMany({
    where: {
      coachProfileId: coachProfile.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      batch: { select: { id: true, name: true, code: true } },
      attendance: { select: { id: true } },
    },
    orderBy: { date: "desc" },
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Payouts & History</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Your earnings breakdown for the selected month.
            {coachProfile.tdsApplicable && <span className="ml-2 text-amber-600 dark:text-amber-500 font-medium">TDS 10% applicable</span>}
          </p>
        </div>
        <MonthPicker />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white dark:bg-[#1a1f2e] border-slate-200/90 dark:border-slate-700/50 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">Gross Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">₹{grossEarned.toLocaleString()}</div>
          </CardContent>
        </Card>
        {totalPenalties > 0 && (
          <Card className="bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-rose-700 dark:text-rose-400">Penalties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-500">−₹{totalPenalties.toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
        {tdsAmount > 0 && (
          <Card className="bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-500">TDS (10%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">−₹{tdsAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
        <Card className="border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Net Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">₹{netPayout.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-[#1a1f2e] border-slate-200/90 dark:border-slate-700/50 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">Classes Held</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalClasses}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-[#1a1f2e] border-slate-200/90 dark:border-slate-700/50 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">Hours Taught</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{(totalMinutes / 60).toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-[#1a1f2e] border-slate-200/90 dark:border-slate-700/50 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalBatchesTaught}</div>
          </CardContent>
        </Card>
      </div>

      {/* Net Payout breakdown */}
      <Card className="bg-white dark:bg-[#1a1f2e] border-slate-200/90 dark:border-slate-700/50 shadow-xs">
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-700/50">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Payout Calculation</h2>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="flex justify-between text-slate-700 dark:text-slate-300">
            <span>Gross ({totalClasses} classes)</span>
            <span className="font-semibold text-slate-900 dark:text-white">₹{grossEarned.toLocaleString()}</span>
          </div>
          {totalPenalties > 0 && (
            <div className="flex justify-between text-rose-600 dark:text-rose-400">
              <span>Penalties (deducted)</span>
              <span className="font-semibold">−₹{totalPenalties.toLocaleString()}</span>
            </div>
          )}
          {coachProfile.payoutAdjustments.filter((a: any) => a.month === monthString).map((adj: any) => (
            <div key={adj.id} className={`flex justify-between ${ADJ_COLORS[adj.type] || "text-slate-600 dark:text-slate-400"}`}>
              <span>{adj.type === "DEDUCTION" ? "Deduction" : "Bonus"}: {adj.reason}</span>
              <span className="font-semibold">
                {adj.type === "DEDUCTION" ? "−" : "+"}₹{adj.amount.toLocaleString()}
              </span>
            </div>
          ))}
          {tdsAmount > 0 && (
            <div className="flex justify-between text-amber-600 dark:text-amber-500">
              <span>TDS (10%)</span>
              <span className="font-semibold">−₹{tdsAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400 text-base pt-3 border-t border-slate-200/80 dark:border-slate-700/50 mt-3 font-bold">
            <span>Net Transferrable</span>
            <span>₹{netPayout.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Class History */}
      <Card className="bg-white dark:bg-[#1a1f2e] border-slate-200/90 dark:border-slate-700/50 shadow-xs">
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-700/50 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Class History</h2>
          <Badge variant="neutral">{filteredLogs.length} Sessions</Badge>
        </div>
        <div className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              No classes logged for this month.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      {log.batch.name}
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-medium">{log.batch.code}</span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(log.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {" • "}
                      {log.durationMins} mins
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 dark:text-white">₹{log.payoutAmount.toLocaleString()}</div>
                    {log.penaltyAmount && log.penaltyAmount > 0 ? (
                      <div className={`flex flex-col items-end gap-0.5 mt-0.5 ${log.penaltyWaived ? "text-slate-400 line-through" : "text-rose-600 dark:text-rose-400"}`}>
                        <div className="text-xs font-semibold">−₹{log.penaltyAmount} penalty</div>
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
      <Card className="bg-white dark:bg-[#1a1f2e] border-slate-200/90 dark:border-slate-700/50 shadow-xs">
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-700/50">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Batch-wise Earnings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-transparent">
              <tr>
                <th className="px-4 py-3 font-semibold">Batch</th>
                <th className="px-4 py-3 font-semibold text-center">Sessions</th>
                <th className="px-4 py-3 font-semibold text-right">Penalties</th>
                <th className="px-4 py-3 font-semibold text-right">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {batchBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No data available.</td>
                </tr>
              ) : (
                batchBreakdown.map(b => (
                  <tr key={b.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{b.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{b.code}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{b.sessions}</td>
                    <td className="px-4 py-3 text-right">
                      {b.penalties > 0 ? <span className="text-rose-600 dark:text-rose-400 font-semibold">−₹{b.penalties}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">₹{b.payout.toLocaleString()}</td>
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
