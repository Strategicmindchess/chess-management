import { processChessFetchJob } from '../src/workers/chess-fetch.worker';
import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  console.log('Finding Nikhilesh...');
  const student = await prisma.studentProfile.findFirst({
    where: { chessComId: 'Nikhilesh39' }
  });

  if (!student) {
    console.error('Nikhilesh not found in DB!');
    return;
  }

  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');

  // Mock a BullMQ Job
  const mockJob = {
    data: {
      studentProfileId: student.id,
      chessComUsername: student.chessComId,
      lichessUsername: student.lichessId,
      periodType: 'MONTHLY',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString()
    },
    updateProgress: async (p: number) => {
      console.log(`[Progress] ${p}%`);
    }
  } as any;

  console.log('Running processChessFetchJob...');
  const result = await processChessFetchJob(mockJob);
  console.log('Result:', result);

  console.log('\\n--- Validating DB Insertion ---');
  const stats = await prisma.studentChessStats.findUnique({
    where: { studentProfileId: student.id }
  });
  console.log('StudentChessStats:', stats);

  const snap = await prisma.chessActivitySnapshot.findUnique({
    where: {
      studentProfileId_periodType_periodStart: {
        studentProfileId: student.id,
        periodType: 'MONTHLY',
        periodStart
      }
    }
  });
  console.log('ChessActivitySnapshot:', snap);
  
  const logCount = await prisma.chessApiFetchLog.count({
    where: { studentProfileId: student.id }
  });
  console.log(`Total API Fetch Logs for this student: ${logCount}`);
}

main().catch(console.error);
