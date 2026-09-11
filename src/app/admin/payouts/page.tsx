import { getAdminPayoutSummary, getCoachPayoutSummary, getEmployeePayoutSummary } from "@/actions/payout-actions";
import { MonthPicker } from "@/components/ui/month-picker";
import { PayoutBatchCard } from "@/components/admin/payouts/payout-batch-card";
import { CoachPayoutCard } from "@/components/admin/payouts/coach-payout-card";
import { EmployeePayoutCard } from "@/components/admin/payouts/employee-payout-card";
import { ProcessPayoutsButton } from "@/components/admin/payouts/process-payouts-button";
import { format } from "date-fns";
import Link from "next/link";

type View = "batch" | "coach" | "staff";

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const { month, view } = await searchParams;
  const monthString = month || format(new Date(), "yyyy-MM");
  const activeView: View =
    view === "coach" ? "coach" : view === "staff" ? "staff" : "batch";

  const [batchSummary, coachSummary, staffSummary] = await Promise.all([
    getAdminPayoutSummary(monthString),
    getCoachPayoutSummary(monthString),
    getEmployeePayoutSummary(monthString),
  ]);

  const grandTotal =
    activeView === "coach"
      ? coachSummary.reduce((acc, c) => acc + c.netPayout, 0)
      : activeView === "staff"
      ? staffSummary.reduce((acc, e) => acc + e.netPayout, 0)
      : batchSummary.reduce((acc, b) => acc + b.totalPayout, 0);

  // For bottom bar label
  const grandTotalLabel =
    activeView === "coach" ? "Coaches Net Total"
    : activeView === "staff" ? "Staff Net Total"
    : "Batch Gross Total";

  const countLabel =
    activeView === "coach" ? `${coachSummary.length} Coaches`
    : activeView === "staff" ? `${staffSummary.length} Staff Members`
    : `${batchSummary.length} Batches`;

  const TAB_STYLE = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
      active ? "bg-slate-900 text-white border-slate-900 dark:bg-brand-500/20 dark:text-brand-400 dark:border-brand-500/30" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800"
    }`;

  const DOWNLOAD_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white w-full sm:w-auto text-left">
          Payout Summary
        </h1>
        <MonthPicker />
        <div className="w-full sm:w-auto text-right sm:text-left text-sm text-slate-500 font-medium">
          {countLabel}
        </div>
      </div>

      {/* View Tabs + Export buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <a href={`?month=${monthString}&view=batch`} className={TAB_STYLE(activeView === "batch")}>By Batch</a>
        <a href={`?month=${monthString}&view=coach`} className={TAB_STYLE(activeView === "coach")}>By Coach</a>
        <a href={`?month=${monthString}&view=staff`} className={TAB_STYLE(activeView === "staff")}>
          By Staff
          {staffSummary.length > 0 && (
            <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{staffSummary.length}</span>
          )}
        </a>

        {/* Export buttons */}
        <div className="ml-auto flex gap-2">
          <ProcessPayoutsButton monthString={monthString} />
          <Link
            href={`/api/export/payouts?month=${monthString}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            {DOWNLOAD_ICON} Export Payouts
          </Link>
          <Link
            href={`/api/export/attendance?month=${monthString}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            {DOWNLOAD_ICON} Export Attendance
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 flex-grow pb-24">
        {activeView === "batch" && (
          batchSummary.length === 0 ? (
            <EmptyState title="No batch payouts" desc="No class logs recorded for this month." />
          ) : (
            batchSummary.map(batch => (
              <PayoutBatchCard
                key={batch.batchId}
                batchId={batch.batchId}
                batchName={batch.batchName}
                coachName={batch.coachName}
                totalSessions={batch.totalSessions}
                totalPayout={batch.totalPayout}
                monthString={monthString}
              />
            ))
          )
        )}

        {activeView === "coach" && (
          coachSummary.length === 0 ? (
            <EmptyState title="No coach payouts" desc="No class logs recorded for this month." />
          ) : (
            coachSummary.map(coach => (
              <CoachPayoutCard key={coach.coachId} coach={coach} monthString={monthString} />
            ))
          )
        )}

        {activeView === "staff" && (
          staffSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-dashed">
              <p className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">No staff members</p>
              <p className="text-sm text-center">
                Add employees or freelancers in the{" "}
                <a href="/admin/employees" className="text-blue-600 underline">Employees</a> section.
              </p>
            </div>
          ) : (
            <>
              {/* Staff payout summary totals */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Gross", val: staffSummary.reduce((a, e) => a + e.grossPayout, 0), color: "text-slate-700" },
                  { label: "TDS Deductions", val: staffSummary.reduce((a, e) => a + e.tdsAmount, 0), color: "text-amber-600" },
                  { label: "Total Net", val: staffSummary.reduce((a, e) => a + e.netPayout, 0), color: "text-emerald-700" },
                ].map(s => (
                  <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>₹{s.val.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {staffSummary.map(emp => (
                <EmployeePayoutCard key={emp.employeeId} emp={emp} />
              ))}
            </>
          )
        )}
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 right-0 w-full lg:w-[calc(100%-16rem)] p-4 bg-white dark:bg-[#0f1419] border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 flex items-center justify-between lg:px-10">
        <span className="text-lg font-semibold text-slate-600 dark:text-slate-300">{grandTotalLabel}</span>
        <span className="text-2xl font-bold text-emerald-700">₹{grandTotal.toLocaleString()}</span>
      </div>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-dashed">
      <p className="mb-2 text-lg font-medium text-slate-900 dark:text-slate-100">{title}</p>
      <p className="text-sm text-center">{desc}</p>
    </div>
  );
}

