import { getAdminPayoutSummary, getCoachPayoutSummary } from "@/actions/payout-actions";
import { MonthPicker } from "@/components/ui/month-picker";
import { PayoutBatchCard } from "@/components/admin/payouts/payout-batch-card";
import { CoachPayoutCard } from "@/components/admin/payouts/coach-payout-card";
import { format } from "date-fns";

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const { month, view } = await searchParams;
  const monthString = month || format(new Date(), "yyyy-MM");
  const activeView = view === "coach" ? "coach" : "batch";

  const [batchSummary, coachSummary] = await Promise.all([
    getAdminPayoutSummary(monthString),
    getCoachPayoutSummary(monthString),
  ]);

  const grandTotal =
    activeView === "coach"
      ? coachSummary.reduce((acc, c) => acc + c.netPayout, 0)
      : batchSummary.reduce((acc, b) => acc + b.totalPayout, 0);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 w-full sm:w-auto text-left">
          Payout Summary
        </h1>
        <MonthPicker />
        <div className="w-full sm:w-auto text-right sm:text-left text-sm text-slate-500 font-medium">
          {activeView === "batch" ? `${batchSummary.length} Batches` : `${coachSummary.length} Coaches`}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        <a
          href={`?month=${monthString}&view=batch`}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
            activeView === "batch"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          By Batch
        </a>
        <a
          href={`?month=${monthString}&view=coach`}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
            activeView === "coach"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          By Coach
        </a>
      </div>

      <div className="space-y-4 flex-grow pb-24">
        {activeView === "batch" ? (
          batchSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-lg border border-slate-200 border-dashed">
              <p className="mb-2 text-lg font-medium text-slate-900">No payouts found</p>
              <p className="text-sm text-center">There are no class logs recorded for the selected month.</p>
            </div>
          ) : (
            batchSummary.map((batch) => (
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
        ) : (
          coachSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-lg border border-slate-200 border-dashed">
              <p className="mb-2 text-lg font-medium text-slate-900">No coach payouts found</p>
              <p className="text-sm text-center">There are no class logs recorded for the selected month.</p>
            </div>
          ) : (
            coachSummary.map((coach) => (
              <CoachPayoutCard
                key={coach.coachId}
                coach={coach}
                monthString={monthString}
              />
            ))
          )
        )}
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 right-0 w-full lg:w-[calc(100%-16rem)] p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 flex items-center justify-between lg:px-10">
        <span className="text-lg font-semibold text-slate-600">
          {activeView === "coach" ? "Total Net Payout" : "Summary Total"}
        </span>
        <span className="text-2xl font-bold text-emerald-700">₹{grandTotal.toLocaleString()}</span>
      </div>
    </div>
  );
}
