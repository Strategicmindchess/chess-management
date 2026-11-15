'use client';

import { Trophy, CheckCircle2, Gift, Watch, IndianRupee, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MilestoneProgressItem } from '@/services/referral/milestone.service';

interface MilestoneProgressTrackerProps {
  totalQualifiedCount: number;
  milestones: MilestoneProgressItem[];
  activeMilestone: MilestoneProgressItem;
  overallProgressPercentage: number;
  onOpenClaimModal: (milestone: MilestoneProgressItem) => void;
}

export function MilestoneProgressTracker({
  totalQualifiedCount,
  milestones,
  activeMilestone,
  onOpenClaimModal,
}: MilestoneProgressTrackerProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161a24]">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Reward Milestones & Progress
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Milestones are cumulative. Rewards unlock progressively as your referred chessmates complete their first paid fee cycle and batch assignment.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
          <span>{totalQualifiedCount} Qualified Chessmates</span>
        </div>
      </div>

      {/* Multi-tier Milestone Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {milestones.map((m) => {
          const isCurrentTarget = m.id === activeMilestone.id;
          const isUnlocked = m.isUnlocked;
          const isClaimed = m.isClaimed;
          const progressTowardThis = Math.min(
            100,
            Math.round((totalQualifiedCount / m.requiredReferrals) * 100)
          );

          return (
            <div
              key={m.id}
              className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-5 transition-all ${
                isUnlocked
                  ? 'border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-[#161a24]'
                  : isCurrentTarget
                  ? 'border-amber-300 bg-amber-50/30 shadow-md ring-2 ring-amber-400/20 dark:border-amber-800 dark:bg-amber-950/10'
                  : 'border-slate-200 bg-slate-50/50 opacity-80 dark:border-slate-800 dark:bg-slate-900/40'
              }`}
            >
              {/* Badge */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    isUnlocked
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : isCurrentTarget
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {isUnlocked ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Milestone Unlocked
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Tier {m.milestoneOrder}
                    </>
                  )}
                </span>
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  {m.requiredReferrals} {m.requiredReferrals === 1 ? 'Student' : 'Students'}
                </span>
              </div>

              {/* Title & Rewards description */}
              <div className="my-4 space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {m.title}
                </h3>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {m.maxCashAmount > 0 && (
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      <IndianRupee className="h-3.5 w-3.5" />
                      <span>Cash reward up to ₹{m.maxCashAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {m.giftDescription && (
                    <div className="flex items-center gap-1.5 font-semibold text-[#A94D0B] dark:text-amber-400">
                      <Watch className="h-3.5 w-3.5" />
                      <span>{m.giftDescription}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar within card */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <span>Progress</span>
                  <span>{Math.min(totalQualifiedCount, m.requiredReferrals)} / {m.requiredReferrals}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isUnlocked ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${progressTowardThis}%` }}
                  />
                </div>
              </div>

              {/* Action / Claim CTA */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                {isClaimed ? (
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Claim Status:</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {m.claimStatus || 'Submitted'}
                    </span>
                  </div>
                ) : isUnlocked ? (
                  <Button
                    onClick={() => onOpenClaimModal(m)}
                    className="w-full bg-[#A94D0B] hover:bg-[#8e4008] text-white font-bold text-xs shadow-sm"
                    size="sm"
                  >
                    <Gift className="mr-1.5 h-3.5 w-3.5" />
                    Claim Reward
                  </Button>
                ) : (
                  <div className="flex items-center justify-center text-[11px] font-semibold text-slate-400">
                    <span>{m.requiredReferrals - totalQualifiedCount} more student(s) to unlock</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

