import { prisma } from '../src/lib/prisma';
import { processChessFetch } from '../src/workers/chess-fetch.worker';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function runFloraFetch() {
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');
  const student = await prisma.studentProfile.findFirst({
    where: { chessAccount: { chessComUsername: 'Floraaheree' } },
    include: { chessAccount: true }
  });

  if (!student) {
    console.log('Student not found');
    return;
  }

  const mockJob: any = {
    data: {
      studentProfileId: student.id,
      chessComUsername: student.chessAccount?.chessComUsername,
      lichessUsername: student.chessAccount?.lichessUsername,
      periodType: 'MONTHLY',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
    log: async (msg: string) => console.log(`[JobLog] ${msg}`),
    updateProgress: async (p: number) => console.log(`[Progress] ${p}%`),
  };

  console.log('Running processChessFetch for Flora...');
  const result = await processChessFetch(mockJob);
  console.log('\nResult Snapshot from processChessFetch:');
  console.log(result);
}

runFloraFetch().catch(console.error).finally(() => prisma.$disconnect());
