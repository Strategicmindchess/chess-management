import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { prisma } from '@/lib/prisma';
import { getLeaderboard, getStudentCoachFeedback } from '@/actions/leaderboard/leaderboard-actions';
import { getMyRefreshStatus } from '@/actions/leaderboard/fetch-actions';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { RewardsPanel } from '@/components/leaderboard/RewardsPanel';
import { RuleBook } from '@/components/leaderboard/RuleBook';
import { RefreshStatusBadge } from '@/components/leaderboard/RefreshStatusBadge';
import { LinkChessAccountForm } from '@/components/leaderboard/LinkChessAccountForm';
import { Trophy, Calendar, Flame, Star, BookOpen, Link2, MessageSquareQuote } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentLeaderboardPage() {
  const user = await requireRole([Role.STUDENT]);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: {
      chessAccount: true,
      leaderboardEntries: {
        orderBy: { periodStart: 'desc' },
        take: 1,
      },
    },
  });

  const chessAccount = studentProfile?.chessAccount;
  const hasLinkedAccounts = !!(chessAccount?.chessComUsername || chessAccount?.lichessUsername);

  // Fetch leaderboard data
  const [monthlyData, weeklyData, refreshStatus, coachFeedback] = await Promise.all([
    getLeaderboard('MONTHLY'),
    getLeaderboard('WEEKLY'),
    getMyRefreshStatus(),
    getStudentCoachFeedback('MONTHLY', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  ]);

  const puzzleSolverAward = monthlyData.puzzleSolverAward as {
    totalPuzzlesSolved: number;
    student: { user: { name: string } };
  } | null;

  // Active tab state is client-side — we use URL param or default to monthly
  const tabs = ['Monthly', 'Weekly', 'Rules', 'My Account'] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            Leaderboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Compete with fellow students across Chess.com & Lichess activity.
          </p>
        </div>

        {/* Refresh button */}
        {hasLinkedAccounts && (
          <RefreshStatusBadge
            lastRefreshedAt={refreshStatus.lastRefreshedAt}
            isRefreshing={refreshStatus.isRefreshing}
            cooldownMinutes={refreshStatus.cooldownMinutes ?? 30}
            periodType="MONTHLY"
          />
        )}
      </div>

      {/* No account linked warning */}
      {!hasLinkedAccounts && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Link2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Link your chess accounts to participate</p>
            <p className="text-xs text-amber-600 mt-1">
              Connect your Chess.com and/or Lichess username in &ldquo;My Account&rdquo; tab below to appear on the leaderboard.
            </p>
          </div>
        </div>
      )}

      {/* Puzzle Solver Award Banner */}
      {puzzleSolverAward && (
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-yellow-300 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">⭐ Highest Puzzle Solver This Month</p>
              <p className="text-xs text-white/80 mt-0.5">
                <strong>{(puzzleSolverAward as { student: { user: { name: string } }; totalPuzzlesSolved: number }).student.user.name}</strong>
                {' '}with {(puzzleSolverAward as { totalPuzzlesSolved: number }).totalPuzzlesSolved} puzzles solved!
                {' '}Prize: ₹100 Cash Reward 💰
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Leaderboard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab navigation — simple link-based */}
          <div>
            <div className="flex border-b border-slate-200 mb-4">
              {[
                { label: 'Monthly', icon: Calendar, id: 'monthly' },
                { label: 'Weekly', icon: Flame, id: 'weekly' },
                { label: 'Rule Book', icon: BookOpen, id: 'rules' },
                { label: 'My Account', icon: Link2, id: 'account' },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    data-tab={tab.id}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-500 border-b-2 border-transparent hover:text-slate-700 hover:border-slate-300 transition-colors first:pl-0"
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Monthly leaderboard */}
            <div id="tab-monthly">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-600" />
                  Monthly Leaderboard
                </h2>
                {monthlyData.calculatedAt && (
                  <span className="text-[10px] text-slate-400">
                    Calculated: {monthlyData.calculatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                  </span>
                )}
              </div>
              <LeaderboardTable
                entries={monthlyData.entries}
                currentStudentId={studentProfile?.id}
                hideOtherUsernames={true}
              />
            </div>
          </div>

          {/* Rule Book section (always visible below) */}
          <div className="border-t border-slate-100 pt-6">
            <RuleBook />
          </div>

          {/* Chess Account linking */}
          <div className="border-t border-slate-100 pt-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5 text-brand-600" />
              My Chess Accounts
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <LinkChessAccountForm
                currentChessCom={chessAccount?.chessComUsername}
                currentLichess={chessAccount?.lichessUsername}
              />
            </div>
          </div>
        </div>

        {/* Right — Rewards panel */}
        <div className="space-y-4">
          <RewardsPanel />

          {/* My current score */}
          {studentProfile?.leaderboardEntries[0] && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3">My Current Score</h3>
              <div className="text-center">
                <p className="text-4xl font-black text-brand-600">
                  {studentProfile.leaderboardEntries[0].totalScore}
                </p>
                <p className="text-xs text-slate-400 mt-1">/ 1000 points</p>
              </div>
              <div className="mt-3 text-center">
                  <p className="text-xs text-slate-500">
                  Rank #{studentProfile.leaderboardEntries[0].rank ?? '—'}
                </p>
              </div>
            </div>
          )}

          {/* Teacher Feedback Report */}
          {coachFeedback && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-brand-600" />
                Coach Feedback Report
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Coach</span>
                  <span className="font-semibold text-slate-700">{coachFeedback.coach.user.name}</span>
                </div>
                
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Engagement</span>
                    <span className="font-medium text-slate-700">{coachFeedback.engagement} / 10</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Behaviour</span>
                    <span className="font-medium text-slate-700">{coachFeedback.behaviour} / 10</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Concept Adoption</span>
                    <span className="font-medium text-slate-700">{coachFeedback.conceptAdoption} / 10</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Punctuality</span>
                    <span className="font-medium text-slate-700">{coachFeedback.joiningOnTime} / 10</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Camera On</span>
                    <span className="font-medium text-slate-700">{coachFeedback.cameraOn} / 10</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">Total Score</span>
                  <span className="font-black text-brand-600">
                    {coachFeedback.engagement + coachFeedback.behaviour + coachFeedback.conceptAdoption + coachFeedback.joiningOnTime + coachFeedback.cameraOn} <span className="text-xs text-slate-400 font-medium">/ 50</span>
                  </span>
                </div>

                {coachFeedback.remarks && (
                  <div className="mt-3 p-3 bg-brand-50 rounded-lg border border-brand-100">
                    <p className="text-xs text-slate-700 italic">"{coachFeedback.remarks}"</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
