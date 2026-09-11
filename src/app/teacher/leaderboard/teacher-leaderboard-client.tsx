"use client";

import { useSearchParams } from 'next/navigation';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { RewardsPanel } from '@/components/leaderboard/RewardsPanel';
import { TeacherFeedbackManager } from '@/components/leaderboard/TeacherFeedbackManager';
import { Trophy, Users, Star, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTeacherLeaderboard } from '@/hooks/use-teacher-leaderboard';

export function TeacherLeaderboardClient() {
  const searchParams = useSearchParams();
  const periodType = searchParams.get('period') === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY';

  const { data, isLoading, error } = useTeacherLeaderboard(periodType);

  if (error) {
    return <div className="text-red-500">Failed to load leaderboard data.</div>;
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const { leaderboardData, myStudentIds, myStudents, feedbackMap, periodStart } = data;
  const myEntries = leaderboardData.entries;
  const puzzleSolverAward = leaderboardData.puzzleSolverAward;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-500" />
          Student Leaderboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View your students&apos; leaderboard rankings and submit monthly feedback scores.
        </p>
      </div>

      {/* Puzzle Solver Award */}
      {puzzleSolverAward && (
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-yellow-300 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">⭐ Highest Puzzle Solver This {periodType === 'WEEKLY' ? 'Week' : 'Month'}</p>
              <p className="text-xs text-white/80 mt-0.5">
                <strong>{puzzleSolverAward.student.user.name}</strong> — {puzzleSolverAward.totalPuzzlesSolved} puzzles solved
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-800">
                Global {periodType === 'WEEKLY' ? 'Weekly' : 'Monthly'} Rankings
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <Link href="?period=MONTHLY" className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${periodType === 'MONTHLY' ? 'bg-white shadow text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>Monthly</Link>
                <Link href="?period=WEEKLY" className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${periodType === 'WEEKLY' ? 'bg-white shadow text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>Weekly</Link>
              </div>
              <TeacherFeedbackManager
                students={myStudents}
                periodType={periodType}
                periodStart={periodStart}
                existingFeedbacks={feedbackMap}
              />
            </div>
          </div>

          <LeaderboardTable entries={myEntries} highlightStudentIds={new Set(myStudentIds)} hideOtherUsernames={true} />

          {myEntries.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No leaderboard data for your students yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Students need to link their chess accounts and refresh their data.
              </p>
            </div>
          )}
        </div>

        {/* Rewards panel */}
        <div>
          <RewardsPanel />
        </div>
      </div>
    </div>
  );
}

