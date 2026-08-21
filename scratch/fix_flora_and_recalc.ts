import { prisma } from '../src/lib/prisma';
import { processChessFetch } from '../src/workers/chess-fetch.worker';
import { processLeaderboardCalc } from '../src/workers/leaderboard-calc.worker';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function fixFloraAndRecalc() {
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');
  const student = await prisma.studentProfile.findFirst({
    where: { chessAccount: { chessComUsername: 'Floraaheree' } },
    include: { chessAccount: true }
  });

  if (!student) {
    console.log('Flora not found');
    return;
  }

  console.log('1. Fetching Flora with fixed normalizer...');
  const mockJob: any = {
    data: {
      studentProfileId: student.id,
      chessComUsername: student.chessAccount?.chessComUsername,
      lichessUsername: student.chessAccount?.lichessUsername,
      periodType: 'MONTHLY',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
    log: async (msg: string) => console.log(`[FetchLog] ${msg}`),
    updateProgress: async () => {},
  };

  const snap = await processChessFetch(mockJob);
  console.log('Flora New Snapshot:');
  console.log(snap);

  console.log('\n2. Recalculating Leaderboard...');
  const calcJob: any = {
    name: 'calc-leaderboard',
    data: {
      periodType: 'MONTHLY',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
    log: async () => {},
    updateProgress: async () => {},
  };

  await processLeaderboardCalc(calcJob);

  const top10 = await prisma.leaderboardEntry.findMany({
    where: {
      periodType: 'MONTHLY',
      periodStart: periodStart
    },
    orderBy: { rank: 'asc' },
    take: 10,
    include: {
      student: { include: { user: true } }
    }
  });

  console.log('\n=== NEW TOP 10 LEADERBOARD ===');
  for (const e of top10) {
    console.log(`#${e.rank} ${e.student.user.name} - ${e.totalScore} pts (Puzzles: ${e.puzzlePoints} pts, R+C: ${e.rapidClassicalPoints} pts, Blitz: ${e.blitzPoints} pts)`);
  }
}

fixFloraAndRecalc().catch(console.error).finally(() => prisma.$disconnect());
