import { prisma } from '../src/lib/prisma';
async function main() {
  const logs = await prisma.leaderboardCalculationLog.findMany({
    orderBy: { startedAt: 'desc' }
  });
  console.log(logs);
}
main().finally(() => prisma.$disconnect());
