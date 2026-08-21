import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const periodType = "MONTHLY";
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();

  const entries = await prisma.leaderboardEntry.findMany({
    where: { periodType, periodStart: new Date(periodStart) },
    include: { student: { include: { user: true } } }
  });

  console.log(`Found ${entries.length} leaderboard entries for period ${periodStart}`);
  for (const entry of entries) {
    console.log(`- ${entry.student.user.name}: Score=${entry.totalScore}, Rank=${entry.rank}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
