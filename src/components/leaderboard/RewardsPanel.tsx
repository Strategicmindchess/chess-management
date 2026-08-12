'use client';

import { Gift, Star, Crown, Medal } from 'lucide-react';

const REWARDS = [
  {
    rank: '1st',
    reward: '1 Month Chess.com Premium Membership',
    icon: Crown,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 border-yellow-200',
  },
  {
    rank: '2nd',
    reward: '1 Month Chess.com Gold Membership',
    icon: Medal,
    color: 'text-slate-400',
    bg: 'bg-slate-50 border-slate-200',
  },
  {
    rank: '3rd',
    reward: 'Dairy Milk Chocolate 🍫',
    icon: Medal,
    color: 'text-orange-400',
    bg: 'bg-orange-50 border-orange-200',
  },
  {
    rank: '4th–10th',
    reward: 'Opportunity to play a live game against the Head Coach',
    icon: Star,
    color: 'text-brand-500',
    bg: 'bg-brand-50 border-brand-200',
  },
];

export function RewardsPanel() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-brand-600 to-purple-600 p-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-white" />
          <h3 className="text-sm font-bold text-white">Monthly Rewards</h3>
        </div>
        <p className="text-xs text-white/70 mt-0.5">Top performers earn amazing prizes!</p>
      </div>
      <div className="p-3 space-y-2">
        {REWARDS.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.rank}
              className={`flex items-start gap-3 p-3 rounded-lg border ${r.bg}`}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${r.color}`} />
              <div>
                <p className={`text-xs font-bold ${r.color}`}>{r.rank} Place</p>
                <p className="text-xs text-slate-600 mt-0.5">{r.reward}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Special Award */}
      <div className="mx-3 mb-3 p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-200">
        <p className="text-xs font-bold text-violet-700 flex items-center gap-1">
          ⭐ Special Monthly Award
        </p>
        <p className="text-xs text-violet-600 mt-1">
          <strong>Highest Puzzle Solver</strong> — student with most puzzles solved (Chess.com + Lichess combined)
        </p>
        <p className="text-xs text-violet-500 mt-1 font-semibold">Prize: ₹100 Cash Reward 💰</p>
      </div>
    </div>
  );
}
