import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';
import { calcLeaderboardJob } from '../src/workers/leaderboard-calc.worker';

async function main() {
  const period = getCurrentPeriod('MONTHLY');
  
  console.log('Triggering calculation for period:', period.periodStart);

  // Directly run the logic instead of via BullMQ
  const workerModule = await import('../src/workers/leaderboard-calc.worker');
  const processLeaderboardCalcJob = workerModule.default;
  
  // We mock the job object
  const mockJob: any = {
    data: {
      periodType: 'MONTHLY',
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
    },
    updateProgress: async (p: number) => console.log('Progress:', p)
  };

  await processLeaderboardCalcJob(mockJob);
  
  console.log('Calc finished. Let us check Fiona and Nikhilesh.');

  const entries = await prisma.leaderboardEntry.findMany({
    where: { periodType: 'MONTHLY', periodStart: period.periodStart },
    include: { student: { include: { user: true } } },
    orderBy: { totalScore: 'desc' }
  });

  for (const e of entries) {
    if (e.student.user.name.includes('Fiona') || e.student.user.name.includes('Nikhilesh')) {
      console.log(`- ${e.student.user.name} | Score: ${e.totalScore} | Rank: ${e.rank}`);
      console.log(`  Snap ID: ${e.snapshotId}`);
      console.log(`  RC: ${e.rapidClassicalPoints}, Blitz: ${e.blitzPoints}, Puzzle: ${e.puzzlePoints}`);
      console.log(`  WinBonus: ${e.winRateBonus}, PuzAccBonus: ${e.puzzleAccuracyBonus}, RatingBonus: ${e.ratingBonus}`);
      console.log(`  StreakBonus: ${e.consistencyBonus}`);
      console.log(`  Coach: ${e.coachFeedback}, Att: ${e.attendance}, Asg: ${e.assignment}, Trn: ${e.tournament}`);
      console.log(`  BulletPen: ${e.bulletPenalty}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
