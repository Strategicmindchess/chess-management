import { processChessFetchJob } from '../src/workers/chess-fetch.worker';
import { processLeaderboardCalc } from '../src/workers/leaderboard-calc.worker';
import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  console.log('Fetching all students...');
  const students = await prisma.studentProfile.findMany();
  console.log(`Found ${students.length} students.`);
  
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');
  const startIso = periodStart.toISOString();
  const endIso = periodEnd.toISOString();

  for (const student of students) {
    console.log(`Processing fetch for ${student.chessComId ?? student.lichessId ?? student.id}...`);
    try {
      const mockJob = {
        data: {
          studentProfileId: student.id,
          chessComUsername: student.chessComId,
          lichessUsername: student.lichessId,
          periodType: 'MONTHLY',
          periodStart: startIso,
          periodEnd: endIso
        },
        updateProgress: async () => {}
      } as any;
      await processChessFetchJob(mockJob);
    } catch (err) {
      console.error(`Failed to fetch for ${student.id}:`, err);
    }
  }

  console.log('\\nRunning Leaderboard Calc for MONTHLY...');
  try {
    await processLeaderboardCalc({
      data: { periodType: 'MONTHLY', periodStart: startIso },
      updateProgress: async () => {}
    } as any);
    console.log('Leaderboard Calc complete!');
  } catch (err) {
    console.error('Leaderboard calc failed:', err);
  }
}

main().catch(console.error).finally(() => process.exit(0));
