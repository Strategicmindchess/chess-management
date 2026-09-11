"use client";

import { useSearchParams } from 'next/navigation';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { RewardsPanel } from '@/components/leaderboard/RewardsPanel';
import {
  Trophy, Calculator, Users,
  Star, Link2, Clock, Loader2
} from 'lucide-react';
import { AdminRefreshControls } from '@/components/leaderboard/AdminRefreshControls';
import { LinkAccountsModal } from '@/components/leaderboard/LinkAccountsModal';
import Link from 'next/link';
import { useAdminLeaderboard } from '@/hooks/use-admin-leaderboard';

export function AdminLeaderboardClient() {
  const searchParams = useSearchParams();
  const periodType = searchParams.get('period') === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY';

  const { data, isLoading, error } = useAdminLeaderboard(periodType);

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

  const {
    leaderboardData,
    calcLog,
    linkedCount,
    totalStudents,
    studentsWithStatus,
    periodStart,
  } = data;

  const puzzleSolverAward = leaderboardData.puzzleSolverAward;

  const stats = [
    { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-slate-700' },
    { label: 'Linked Accounts', value: linkedCount, icon: Link2, color: 'text-brand-600' },
    { label: `Ranked This ${periodType === 'WEEKLY' ? 'Week' : 'Month'}`, value: leaderboardData.entries.length, icon: Trophy, color: 'text-amber-600' },
    {
      label: 'Last Calculated',
      value: calcLog?.completedAt
        ? new Date(calcLog.completedAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
        : 'Never',
      icon: Clock,
      color: 'text-slate-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            Leaderboard Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Full control over chess data refresh, score calculation, and disqualifications.
          </p>
        </div>
        <LinkAccountsModal
          students={studentsWithStatus.success ? studentsWithStatus.students.map((s: any) => ({
            studentProfileId: s.studentProfileId,
            name: s.name,
            email: s.email,
            legacyChessComId: s.legacyChessComId,
            legacyLichessId: s.legacyLichessId,
            hasLegacyData: s.hasLegacyData,
            isLinked: s.isLinked,
            chessAccount: s.chessAccount ? {
              chessComUsername: s.chessAccount.chessComUsername,
              lichessUsername: s.chessAccount.lichessUsername,
            } : null,
          })) : []}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="group relative overflow-hidden bg-white dark:bg-[#1a142c]/90 dark:backdrop-blur-xl dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-purple-500/20 rounded-xl p-4 shadow-sm hover:border-purple-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-[20px] -mr-8 -mt-8 pointer-events-none hidden dark:block" />
              <div className="flex items-center justify-between mb-2 relative z-10">
                <p className="text-xs text-slate-500">{stat.label}</p>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-2xl font-bold relative z-10 ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Admin Controls */}
      <AdminRefreshControls periodStart={periodStart} isCalculating={!!calcLog && !calcLog.completedAt} />

      {/* Calc log */}
      {calcLog && (
        <div className="relative overflow-hidden bg-white dark:bg-[#2a1c0f]/90 dark:backdrop-blur-xl dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-amber-500/20 rounded-xl p-4 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-[20px] -mr-8 -mt-8 pointer-events-none hidden dark:block" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-amber-400 mb-2 flex items-center gap-2 relative z-10">
            <Calculator className="w-4 h-4 text-brand-600" />
            Last Calculation Log
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{calcLog.totalStudents}</p>
              <p className="text-xs text-slate-400">Total Students</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600">{calcLog.calculatedCount}</p>
              <p className="text-xs text-slate-400">Calculated</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-500">{calcLog.disqualifiedCount}</p>
              <p className="text-xs text-slate-400">Disqualified</p>
            </div>
          </div>
          {calcLog.completedAt && (
            <p className="text-xs text-slate-400 mt-2 text-center">
              Completed: {new Date(calcLog.completedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          )}
        </div>
      )}

      {/* Puzzle Solver Award */}
      {puzzleSolverAward && (
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-yellow-300" />
            <div>
              <p className="text-sm font-bold">⭐ Highest Puzzle Solver This {periodType === 'WEEKLY' ? 'Week' : 'Month'}</p>
              <p className="text-xs text-white/80 mt-0.5">
                <strong>{puzzleSolverAward.student.user.name}</strong> — {puzzleSolverAward.totalPuzzlesSolved} puzzles solved
                · Prize: ₹100 Cash Reward 💰
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">{periodType === 'WEEKLY' ? 'Weekly' : 'Monthly'} Leaderboard</h2>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <Link href="?period=MONTHLY" className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${periodType === 'MONTHLY' ? 'bg-white dark:bg-brand-500/20 shadow dark:shadow-brand-500/20 text-brand-700 dark:text-brand-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Monthly</Link>
                <Link href="?period=WEEKLY" className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${periodType === 'WEEKLY' ? 'bg-white dark:bg-brand-500/20 shadow dark:shadow-brand-500/20 text-brand-700 dark:text-brand-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Weekly</Link>
              </div>
            </div>
            {leaderboardData.calculatedAt && (
              <span className="text-xs text-slate-400">
                Calc: {new Date(leaderboardData.calculatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </span>
            )}
          </div>
          <LeaderboardTable entries={leaderboardData.entries} showAdminFlags={true} />
        </div>

        <div>
          <RewardsPanel />
        </div>
      </div>
    </div>
  );
}

