'use client';

import { BookOpen, AlertTriangle, Shield } from 'lucide-react';

export function RuleBook() {
  return (
    <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-brand-600" />
          Leaderboard Rule Book & Point System
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs">
          All scores are calculated automatically from your Chess.com and Lichess activity. 
          The leaderboard refreshes daily. Maximum possible score: <strong className="text-slate-700 dark:text-slate-200">1000 Points</strong>.
        </p>
      </div>

      {/* Point Table */}
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3">📊 Complete Point System</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/50">
                <th className="text-left p-2 rounded-tl-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Category</th>
                <th className="text-center p-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">Max Points</th>
                <th className="text-left p-2 rounded-tr-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">How to Earn</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cat: 'Rapid + Classical Games', max: '174', rule: '2 pts/game • Max 87 games counted' },
                { cat: 'Blitz Games', max: '51', rule: '1 pt/game • Max 51 games counted' },
                { cat: 'Puzzle Solving', max: '225', rule: '0.5 pts/puzzle • Max 450 puzzles' },
                { cat: 'Win Rate Bonus', max: '+75 / −50', rule: 'Win% > 50% → +75 | Win% < 50% → −50' },
                { cat: 'Puzzle Accuracy Bonus', max: '+50 / −25', rule: 'Success% > 70% → +50 | < 70% → −25' },
                { cat: 'Rating Improvement', max: '100', rule: '+25 pts per +50 rating gained (resets monthly)' },
                { cat: 'Consistency Streak', max: '25', rule: '7d=+5 | 14d=+10 | 21d=+15 | 30d=+25' },
                { cat: 'Coach Feedback', max: '50', rule: 'Coach awards 0–10 each for 5 categories' },
                { cat: 'Attendance', max: '50', rule: '≥75% attendance = 50 pts | <75% = 0 pts' },
                { cat: 'Assignments', max: '100', rule: 'All done=100 | ~Half=50 | None=0' },
                { cat: 'Weekly Tournament', max: '100', rule: 'Coach awards 0–100 based on performance' },
                { cat: 'TOTAL', max: '1000', rule: 'Score is capped at 1000 and cannot go above' },
              ].map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
                  <td className="p-2 border border-slate-200 dark:border-slate-700 font-medium">{row.cat}</td>
                  <td className="p-2 border border-slate-200 dark:border-slate-700 text-center font-bold text-brand-700 dark:text-brand-400">{row.max}</td>
                  <td className="p-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">{row.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Streak Details */}
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">🔥 Consistency Streak Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { days: '7 Days', pts: '+5' },
            { days: '14 Days', pts: '+10' },
            { days: '21 Days', pts: '+15' },
            { days: '30 Days', pts: '+25' },
          ].map((s) => (
            <div key={s.days} className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-center">
              <p className="text-emerald-700 dark:text-emerald-400 font-bold text-base">{s.pts}</p>
              <p className="text-emerald-600 dark:text-emerald-500 text-xs mt-0.5">{s.days} Streak</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Activity on Chess.com + Lichess combined counts for streak.</p>
      </div>

      {/* Rating Improvement */}
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">📈 Rating Improvement Bonus</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { gain: '+50 Rating', pts: '+25' },
            { gain: '+100 Rating', pts: '+50' },
            { gain: '+150 Rating', pts: '+75' },
            { gain: '+200+ Rating', pts: '+100' },
          ].map((r) => (
            <div key={r.gain} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
              <p className="text-blue-700 dark:text-blue-400 font-bold text-base">{r.pts}</p>
              <p className="text-blue-600 dark:text-blue-500 text-xs mt-0.5">{r.gain}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          Based on Rapid Rating. Resets at the start of each month. Maximum +100 pts.
        </p>
      </div>

      {/* Rewards */}
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">🏆 Monthly Rewards</h3>
        <div className="space-y-1.5">
          {[
            { rank: '1st Place', reward: '1 Month Chess.com Premium Membership' },
            { rank: '2nd Place', reward: '1 Month Chess.com Gold Membership' },
            { rank: '3rd Place', reward: 'Dairy Milk Chocolate 🍫' },
            { rank: '4th–10th', reward: 'Opportunity to play a live game against the Head Coach' },
          ].map((r) => (
            <div key={r.rank} className="flex gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-brand-600 dark:text-brand-400 w-20 flex-shrink-0">{r.rank}</span>
              <span className="text-slate-600 dark:text-slate-300">{r.reward}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Special Award */}
      <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
        <h3 className="font-bold text-violet-800 dark:text-violet-300 mb-1">⭐ Special Monthly Award</h3>
        <p className="text-violet-700 dark:text-violet-400">
          <strong>Highest Puzzle Solver of the Month</strong> — awarded to the student with the highest 
          total puzzles solved (Chess.com + Lichess combined). This award is independent of the leaderboard ranking.
        </p>
        <p className="text-violet-600 dark:text-violet-400 font-semibold mt-1">Prize: ₹100 Cash Reward 💰</p>
      </div>

      {/* Important Rules */}
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Important Rules
        </h3>
        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <li className="flex gap-2">
            <span className="text-red-500 font-bold flex-shrink-0">⚠</span>
            <span><strong>Bullet/Ultra-Bullet Penalty:</strong> Playing more than 50 bullet or ultra-bullet games in a month results in a −200 point penalty. These games score 0 points.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-500 font-bold flex-shrink-0">⚠</span>
            <span><strong>Score Caps:</strong> Once the maximum for a category is reached, no additional points are awarded. Total score is capped at 1000.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 font-bold flex-shrink-0">ℹ</span>
            <span><strong>Monthly Reset:</strong> Rating improvement bonus and consistency bonus reset at the start of each month.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 font-bold flex-shrink-0">ℹ</span>
            <span><strong>Automatic Refresh:</strong> Leaderboard refreshes daily. You can also manually refresh your data once every {30} minutes.</span>
          </li>
        </ul>
      </div>

      {/* Fair Play */}
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/30">
        <h3 className="font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-1">
          <Shield className="w-4 h-4 text-red-500" />
          Fair Play Policy
        </h3>
        <ul className="space-y-1 text-xs text-red-700 dark:text-red-400">
          <li>• Cheating, sandbagging, or manipulating ratings is strictly prohibited.</li>
          <li>• Admin reserves the right to disqualify any student from the leaderboard for suspicious activity.</li>
          <li>• Only your official Chess.com and Lichess accounts should be linked — no fake accounts.</li>
          <li>• Disqualified students lose all points for that period and cannot win rewards.</li>
        </ul>
      </div>
    </div>
  );
}

