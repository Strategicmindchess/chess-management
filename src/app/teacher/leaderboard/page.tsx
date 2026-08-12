import { requireRole } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { prisma } from '@/lib/prisma';
import { getLeaderboard, getCoachFeedback } from '@/actions/leaderboard/leaderboard-actions';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { RewardsPanel } from '@/components/leaderboard/RewardsPanel';
import { CoachFeedbackForm } from '@/components/leaderboard/CoachFeedbackForm';
import { Trophy, Users, Star } from 'lucide-react';

import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TeacherLeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await requireRole([Role.TEACHER]);

  const params = await searchParams;
  const periodType = params?.period === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY';

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    include: {
      batches: {
        where: { isActive: true },
        include: {
          students: {
            include: {
              student: {
                include: {
                  user: { select: { name: true } },
                  chessAccount: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!coachProfile) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p>Coach profile not found.</p>
      </div>
    );
  }

  // Get all students from this coach's batches
  const myStudentIds = new Set(
    coachProfile.batches.flatMap((b) => b.students.map((s) => s.studentProfileId))
  );

  const myStudents = coachProfile.batches
    .flatMap((b) =>
      b.students.map((s) => ({
        studentProfileId: s.studentProfileId,
        name: s.student.user.name,
        chessComUsername: s.student.chessAccount?.chessComUsername ?? null,
        lichessUsername: s.student.chessAccount?.lichessUsername ?? null,
      }))
    )
    .filter((s, idx, arr) => arr.findIndex((x) => x.studentProfileId === s.studentProfileId) === idx);

  // Fetch leaderboard
  const leaderboardData = await getLeaderboard(periodType);

  // Filter to only my students
  const myEntries = leaderboardData.entries.filter((e) =>
    myStudentIds.has(e.studentProfileId)
  );

  // Get current period start for feedback forms
  const now = new Date();
  const periodStart = periodType === 'MONTHLY' 
    ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    : (() => {
        const d = new Date();
        const dayOfWeek = d.getUTCDay();
        const diffToMonday = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const ws = new Date(d.setUTCDate(diffToMonday));
        ws.setUTCHours(0, 0, 0, 0);
        return ws.toISOString();
      })();

  // Fetch existing feedback for all my students
  const existingFeedbacks = await prisma.coachFeedback.findMany({
    where: {
      coachId: coachProfile.id,
      periodType,
      periodStart: new Date(periodStart),
      studentProfileId: { in: [...myStudentIds] },
    },
  });
  const feedbackMap = new Map(existingFeedbacks.map((f) => [f.studentProfileId, f]));

  const puzzleSolverAward = leaderboardData.puzzleSolverAward as {
    totalPuzzlesSolved: number;
    student: { user: { name: string } };
  } | null;

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
                My Students — {periodType === 'WEEKLY' ? 'Weekly' : 'Monthly'} Rankings
              </h2>
              <span className="text-xs text-slate-400">({myEntries.length} students ranked)</span>
            </div>
            
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <Link href="?period=MONTHLY" className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${periodType === 'MONTHLY' ? 'bg-white shadow text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>Monthly</Link>
              <Link href="?period=WEEKLY" className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${periodType === 'WEEKLY' ? 'bg-white shadow text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>Weekly</Link>
            </div>
          </div>

          <LeaderboardTable entries={myEntries} />

          {myEntries.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No leaderboard data for your students yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Students need to link their chess accounts and refresh their data.
              </p>
            </div>
          )}

          {/* Feedback Forms */}
          <div className="mt-8">
            <h2 className="text-base font-bold text-slate-800 mb-4">
              Submit Monthly Feedback
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {myStudents.map((student) => (
                <div
                  key={student.studentProfileId}
                  className="bg-white border border-slate-200 rounded-xl p-5"
                >
                  <CoachFeedbackForm
                    studentProfileId={student.studentProfileId}
                    studentName={student.name}
                    periodType={periodType}
                    periodStart={periodStart}
                    existing={feedbackMap.get(student.studentProfileId) ?? null}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rewards panel */}
        <div>
          <RewardsPanel />
        </div>
      </div>
    </div>
  );
}
