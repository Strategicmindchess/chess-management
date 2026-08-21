import { triggerLeaderboardCalc } from '../src/actions/leaderboard/fetch-actions';
import { prisma } from '../src/lib/prisma';
import { processLeaderboardCalc } from '../src/workers/leaderboard-calc.worker';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function calcLeaderboardDirect() {
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');
  const mockJob: any = {
    name: 'calc-leaderboard',
    data: {
      periodType: 'MONTHLY',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
    log: async (msg: string) => console.log(`[CalcLog] ${msg}`),
    updateProgress: async (p: number) => console.log(`[CalcProgress] ${p}%`),
  };

  console.log('Calculating leaderboard...');
  const res = await processLeaderboardCalc(mockJob);
  console.log('Calc result:', res);

  const floraEntry = await prisma.leaderboardEntry.findFirst({
    where: {
      studentProfileId: 'cms058awk000004jlepfh1d01',
      periodType: 'MONTHLY'
    }
  });

  console.log('\n=== Flora Leaderboard Entry ===');
  console.log(floraEntry);
}

calcLeaderboardDirect().catch(console.error).finally(() => prisma.$disconnect());
