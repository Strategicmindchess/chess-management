import { Users, CheckCircle2, Clock, IndianRupee, Watch } from 'lucide-react';

interface ReferralStatsCardsProps {
  stats: {
    totalInvited: number;
    registered: number;
    joinedSuccessfully: number;
    pendingVerification: number;
    totalEarnedCash: number;
    physicalGiftsClaimed: number;
  };
}

export function ReferralStatsCards({ stats }: ReferralStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {/* 1. Total Referrals */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161a24]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Referrals</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          {stats.totalInvited}
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          Invited chessmates
        </p>
      </div>

      {/* 2. Joined Successfully */}
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Joined Successfully</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-200">
          {stats.joinedSuccessfully}
        </div>
        <p className="mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
          Batch enrolled & verified
        </p>
      </div>

      {/* 3. Pending Verification */}
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Pending Verification</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
          {stats.pendingVerification + stats.registered}
        </div>
        <p className="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-400/80">
          Awaiting fee or batch setup
        </p>
      </div>

      {/* 4. Rewards Earned */}
      <div className="rounded-xl border border-orange-200/80 bg-orange-50/40 p-4 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-orange-800 dark:text-orange-300">Rewards Disbursed</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-[#A94D0B] dark:bg-orange-900/50 dark:text-orange-300">
            <IndianRupee className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-orange-900 dark:text-orange-200">
          ₹{stats.totalEarnedCash.toLocaleString('en-IN')}
        </div>
        <p className="mt-0.5 text-[11px] text-orange-700/80 dark:text-orange-400/80 flex items-center gap-1">
          {stats.physicalGiftsClaimed > 0 && (
            <>
              <Watch className="inline h-3 w-3" />
              <span>+{stats.physicalGiftsClaimed} Smartwatch</span>
            </>
          )}
          {stats.physicalGiftsClaimed === 0 && 'Cash paid to date'}
        </p>
      </div>
    </div>
  );
}

