'use client';

import { Users, CheckCircle2, Clock, XCircle, AlertCircle, Sparkles } from 'lucide-react';

interface AdminReferralTableProps {
  attributions: any[];
}

export function AdminReferralTable({ attributions }: AdminReferralTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'JOINED_SUCCESSFULLY':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Joined (Qualified)
          </span>
        );
      case 'REGISTERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Clock className="h-3 w-3" />
            Registered
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'DISQUALIFIED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle className="h-3 w-3" />
            Disqualified
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
      {attributions.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          No referral attributions found matching your filter criteria.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-600 dark:border-slate-800 dark:bg-[#121620] dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Referrer (Student)</th>
                <th className="py-3 px-4 font-semibold">Candidate (Referred)</th>
                <th className="py-3 px-4 font-semibold">Code Used</th>
                <th className="py-3 px-4 font-semibold">Qualification Gates</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {attributions.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{a.referrer.name}</div>
                    <div className="text-[11px] text-slate-500">{a.referrer.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{a.candidate.name}</div>
                    <div className="text-[11px] text-slate-500">{a.candidate.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-[#A94D0B] dark:text-amber-400">
                      {a.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5 text-[11px]">
                      <div>
                        <span className="text-slate-400">Paid Cycles: </span>
                        <strong className={a.candidate.paidFeeCycles > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}>
                          {a.candidate.paidFeeCycles}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Batch: </span>
                        <span>{a.candidate.batches}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(a.status)}
                    {a.disqualificationReason && (
                      <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                        {a.disqualificationReason}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    <div>Created: {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                    {a.qualifiedAt && (
                      <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                        Qualified: {new Date(a.qualifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

