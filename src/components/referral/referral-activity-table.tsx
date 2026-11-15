'use client';

import { Users, CheckCircle2, Clock, XCircle, Award, Sparkles } from 'lucide-react';

interface ReferralActivityTableProps {
  referrals: Array<{
    id: string;
    candidateDisplayName: string;
    candidateMaskedEmail: string;
    status: string;
    registeredAt: string | null;
    joinedAt: string | null;
    createdAt: string;
  }>;
}

export function ReferralActivityTable({ referrals }: ReferralActivityTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'JOINED_SUCCESSFULLY':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Joined Successfully (Qualified)
          </span>
        );
      case 'REGISTERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Clock className="h-3 w-3" />
            Registered (Pending Fee / Batch)
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Invite Pending
          </span>
        );
      case 'REWARD_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            <Award className="h-3 w-3" />
            Reward Approved
          </span>
        );
      case 'REWARD_DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800 dark:bg-green-950/60 dark:text-green-300">
            <Sparkles className="h-3 w-3" />
            Reward Delivered
          </span>
        );
      case 'DISQUALIFIED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle className="h-3 w-3" />
            Disqualified (Refund / Cancelled)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-[#161a24]">
      <div className="border-b border-slate-100 p-5 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Referral History & Attribution
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Showing your invited chessmates with privacy protection. Status reflects current registration and qualification progress.
        </p>
      </div>

      {referrals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-[#A94D0B] dark:bg-amber-950/50 dark:text-amber-400">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
            No referrals yet
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Share your unique code or link above with friends and chessmates to start unlocking cash rewards and smartwatches!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-600 dark:border-slate-800 dark:bg-[#121620] dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Chessmate</th>
                <th className="py-3 px-4 font-semibold">Masked Email</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Invited On</th>
                <th className="py-3 px-4 font-semibold">Qualified On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {referrals.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {r.candidateDisplayName}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {r.candidateMaskedEmail}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(r.status)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                    {r.joinedAt
                      ? new Date(r.joinedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
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

