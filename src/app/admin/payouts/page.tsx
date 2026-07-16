import { getAdminPayoutSummary } from "@/actions/payout-actions";
import { MonthPicker } from "@/components/ui/month-picker";
import { PayoutBatchCard } from "@/components/admin/payouts/payout-batch-card";
import { format } from "date-fns";

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const monthString = month || format(new Date(), "yyyy-MM");

  const summary = await getAdminPayoutSummary(monthString);
  const grandTotal = summary.reduce((acc, batch) => acc + batch.totalPayout, 0);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 w-full sm:w-auto text-left">
          Payout Summary
        </h1>
        <MonthPicker />
        <div className="w-full sm:w-auto text-right sm:text-left text-sm text-slate-500 font-medium">
          {/* Empty spacer or additional info for the right corner if needed */}
          {summary.length} Batches
        </div>
      </div>

      <div className="space-y-4 flex-grow pb-24">
        {summary.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-lg border border-slate-200 border-dashed">
            <p className="mb-2 text-lg font-medium text-slate-900">No payouts found</p>
            <p className="text-sm text-center">There are no class logs recorded for the selected month.</p>
          </div>
        ) : (
          summary.map((batch) => (
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
        )}
      </div>

      {/* Fixed bottom bar for Summary Total */}
      <div className="fixed bottom-0 right-0 w-full lg:w-[calc(100%-16rem)] p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 flex items-center justify-between lg:px-10">
        <span className="text-lg font-semibold text-slate-600">Summary Total</span>
        <span className="text-2xl font-bold text-emerald-700">₹{grandTotal.toLocaleString()}</span>
      </div>
    </div>
  );
}
