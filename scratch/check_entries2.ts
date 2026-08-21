import { prisma } from '../src/lib/prisma';

async function main() {
  const entries = await prisma.leaderboardEntry.findMany({
    include: { student: { include: { user: true } } }
  });

  console.log(`Found ${entries.length} total leaderboard entries in the entire database`);
  for (const entry of entries) {
    console.log(`- ${entry.student.user.name}: Score=${entry.totalScore}, Rank=${entry.rank}, Period=${entry.periodType}, Start=${entry.periodStart.toISOString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
