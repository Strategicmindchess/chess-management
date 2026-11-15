'use client';

import { Award, CheckCircle2, Clock, Truck, IndianRupee, AlertCircle, ExternalLink } from 'lucide-react';

interface RewardClaimsTableProps {
  claims: Array<{
    id: string;
    milestoneId: string;
    milestoneTitle: string;
    rewardType: string;
    status: string;
    approvedCashAmount: number | null;
    giftItem: string | null;
    paymentReference: string | null;
    deliveryCourier: string | null;
    deliveryTrackingNumber: string | null;
    claimedAt: string;
    paidAt: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    rejectedReason: string | null;
  }>;
}

export function RewardClaimsTable({ claims }: RewardClaimsTableProps) {
  if (claims.length === 0) return null;

  const getClaimStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Delivered
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Truck className="h-3 w-3" />
            Dispatched
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Clock className="h-3 w-3" />
            Approved (Processing Payout)
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Under Admin Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <AlertCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-[#161a24]">
      <div className="border-b border-slate-100 p-5 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Reward Claims & Fulfillment History
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Track cash disbursement references (UTR) and physical smartwatch courier tracking numbers.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-600 dark:border-slate-800 dark:bg-[#121620] dark:text-slate-400">
            <tr>
              <th className="py-3 px-4 font-semibold">Milestone</th>
              <th className="py-3 px-4 font-semibold">Reward Details</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Payment / Courier Info</th>
              <th className="py-3 px-4 font-semibold">Claimed Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {claims.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                  {c.milestoneTitle}
                </td>
                <td className="py-3.5 px-4">
                  <div className="space-y-0.5">
                    {c.approvedCashAmount !== null && c.approvedCashAmount > 0 && (
                      <span className="block font-semibold text-emerald-700 dark:text-emerald-400">
                        ₹{c.approvedCashAmount.toLocaleString('en-IN')} Cash
                      </span>
                    )}
                    {c.giftItem && (
                      <span className="block text-slate-600 dark:text-slate-300">
                        {c.giftItem}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  {getClaimStatusBadge(c.status)}
                </td>
                <td className="py-3.5 px-4">
                  {c.paymentReference && (
                    <div className="text-[11px]">
                      <span className="text-slate-400">UTR: </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {c.paymentReference}
                      </span>
                    </div>
                  )}
                  {c.deliveryTrackingNumber && (
                    <div className="text-[11px] mt-0.5">
                      <span className="text-slate-400">Courier: </span>
                      <span className="font-medium">{c.deliveryCourier}</span> ({c.deliveryTrackingNumber})
                    </div>
                  )}
                  {c.rejectedReason && (
                    <div className="text-[11px] text-red-600 dark:text-red-400">
                      Reason: {c.rejectedReason}
                    </div>
                  )}
                  {!c.paymentReference && !c.deliveryTrackingNumber && !c.rejectedReason && (
                    <span className="text-slate-400 italic">Processing…</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                  {new Date(c.claimedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

