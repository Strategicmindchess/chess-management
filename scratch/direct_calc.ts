import { processLeaderboardCalc } from '../src/workers/leaderboard-calc.worker';
import { prisma } from '../src/lib/prisma';

async function main() {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
  
  const dummyJob = {
    data: {
      periodType: 'MONTHLY',
      periodStart,
    },
    log: async (msg: string) => console.log(`[LOG] ${msg}`),
    updateProgress: async (p: number) => console.log(`[PROGRESS] ${p}%`),
  } as any;

  console.log("Running direct leaderboard calc...");
  const result = await processLeaderboardCalc(dummyJob);
  console.log("Result:", result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
