'use client';

import { useState } from 'react';
import type { LeaderboardRow } from '@/actions/leaderboard/leaderboard-actions';
import { Trophy, Medal, Star, ChevronDown, ChevronUp, Shield, ExternalLink, Crown } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardRow[];
  currentStudentId?: string;
  highlightStudentIds?: Set<string>;
  showBreakdown?: boolean;
}

const RANK_STYLES: Record<number, { bg: string; text: string; icon: React.ReactNode; border: string }> = {
  1: {
    bg: 'bg-gradient-to-r from-yellow-50 to-amber-50',
    text: 'text-amber-700',
    icon: <Crown className="w-5 h-5 text-yellow-500" />,
    border: 'border-yellow-300',
  },
  2: {
    bg: 'bg-gradient-to-r from-slate-50 to-gray-100',
    text: 'text-slate-700',
    icon: <Medal className="w-5 h-5 text-slate-400" />,
    border: 'border-slate-300',
  },
  3: {
    bg: 'bg-gradient-to-r from-orange-50 to-amber-50',
    text: 'text-orange-700',
    icon: <Medal className="w-5 h-5 text-orange-400" />,
    border: 'border-orange-300',
  },
};

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-500 w-8 text-right">{value}</span>
    </div>
  );
}

function BreakdownPanel({ row }: { row: LeaderboardRow }) {
  const b = row.breakdown;
  const items = [
    { label: 'Rapid + Classical', value: b.rapidClassicalPoints, max: 174, color: 'bg-blue-500' },
    { label: 'Blitz Games', value: b.blitzPoints, max: 51, color: 'bg-indigo-500' },
    { label: 'Puzzle Solving', value: b.puzzlePoints, max: 225, color: 'bg-violet-500' },
    { label: 'Win Rate Bonus', value: b.winRateBonus, max: 75, color: b.winRateBonus >= 0 ? 'bg-green-500' : 'bg-red-400' },
    { label: 'Puzzle Accuracy', value: b.puzzleAccuracyBonus, max: 50, color: b.puzzleAccuracyBonus >= 0 ? 'bg-teal-500' : 'bg-red-400' },
    { label: 'Rating Improvement', value: b.ratingBonus, max: 100, color: 'bg-cyan-500' },
    { label: 'Consistency Streak', value: b.consistencyBonus, max: 25, color: 'bg-emerald-500' },
    { label: 'Coach Feedback', value: b.coachFeedback, max: 50, color: 'bg-pink-500' },
    { label: 'Attendance', value: b.attendance, max: 50, color: 'bg-amber-500' },
    { label: 'Assignments', value: b.assignment, max: 100, color: 'bg-orange-500' },
    { label: 'Tournament', value: b.tournament, max: 100, color: 'bg-rose-500' },
  ];

  return (
    <div className="bg-slate-50 rounded-xl p-4 mt-2 border border-slate-200">
      <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Score Breakdown</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs text-slate-600 flex items-center gap-1.5">
                {item.label}
                {item.value < 0 && <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded uppercase font-bold">Penalty</span>}
                {item.value === 0 && <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded uppercase font-bold">No Score</span>}
              </span>
              <span className={`text-xs font-bold ${item.value < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                {item.value > 0 ? '+' : ''}{item.value}
              </span>
            </div>
            <ScoreBar value={Math.max(0, item.value)} max={item.max} color={item.color} />
          </div>
        ))}
        {b.bulletPenalty < 0 && (
          <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
            <span className="text-xs text-red-600 font-semibold">
              ⚠ Bullet Game Penalty: {b.bulletPenalty} pts (exceeded 50 bullet games)
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-700">Total Score</span>
        <span className="text-lg font-black text-brand-600">{row.totalScore} / 1000</span>
      </div>
    </div>
  );
}

export function LeaderboardTable({ entries, currentStudentId, highlightStudentIds, showBreakdown = true }: LeaderboardTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No leaderboard data yet.</p>
        <p className="text-xs mt-1">Students need to link chess accounts and refresh their data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((row) => {
        const isMe = row.studentProfileId === currentStudentId;
        const isMyStudent = highlightStudentIds?.has(row.studentProfileId);
        
        const rankStyle = RANK_STYLES[row.rank] ?? {
          bg: isMe || isMyStudent ? 'bg-brand-50' : 'bg-white',
          text: 'text-slate-600',
          icon: <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-400">{row.rank}</span>,
          border: isMe || isMyStudent ? 'border-brand-300' : 'border-slate-200',
        };

        const isExpanded = expandedId === row.studentProfileId;

        return (
          <div
            key={row.studentProfileId}
            className={`rounded-xl border ${rankStyle.border} ${rankStyle.bg} overflow-hidden transition-all`}
          >
            {/* Main row */}
            <div
              className="flex items-center gap-3 p-3 cursor-pointer"
              onClick={() => showBreakdown && setExpandedId(isExpanded ? null : row.studentProfileId)}
            >
              {/* Rank */}
              <div className="w-8 flex justify-center flex-shrink-0">
                {row.isDisqualified ? (
                  <div title="Disqualified">
                    <Shield className="w-5 h-5 text-red-400" />
                  </div>
                ) : (
                  rankStyle.icon
                )}
              </div>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {row.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.profilePictureUrl} alt={row.studentName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-brand-700 font-bold text-sm">{row.studentName[0]?.toUpperCase()}</span>
                )}
              </div>

              {/* Name + usernames */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`text-sm font-bold truncate ${rankStyle.text}`}>
                    {row.studentName}
                    {isMe && <span className="ml-1.5 text-[10px] font-semibold bg-brand-600 text-white px-1.5 py-0.5 rounded-full">You</span>}
                    {isMyStudent && !isMe && <span className="ml-1.5 text-[10px] font-semibold bg-brand-100 text-brand-700 border border-brand-200 px-1.5 py-0.5 rounded-full">My Student</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {row.chessComUsername && (
                    <a
                      href={`https://www.chess.com/member/${row.chessComUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-slate-400 hover:text-brand-600 flex items-center gap-0.5"
                    >
                      ♟ {row.chessComUsername} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {row.lichessUsername && (
                    <a
                      href={`https://lichess.org/@/${row.lichessUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-slate-400 hover:text-brand-600 flex items-center gap-0.5"
                    >
                      ⚡ {row.lichessUsername} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className={`text-xl font-black ${row.isDisqualified ? 'text-red-400 line-through' : rankStyle.text}`}>
                    {row.totalScore}
                  </p>
                  <p className="text-[10px] text-slate-400">/ 1000 pts</p>
                </div>
                {showBreakdown && (
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                )}
              </div>
            </div>

            {/* Expanded breakdown */}
            {showBreakdown && isExpanded && (
              <div className="px-3 pb-3">
                <BreakdownPanel row={row} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
