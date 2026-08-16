import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const { periodStart } = getCurrentPeriod('MONTHLY');

  const students = await prisma.studentProfile.findMany({
    where: {
      user: { name: { contains: 'Sarth', mode: 'insensitive' } }
    },
    include: {
      user: true,
      activitySnapshots: {
        where: { periodType: 'MONTHLY', periodStart }
      },
      leaderboardEntries: {
        where: { periodType: 'MONTHLY', periodStart }
      }
    }
  });

  console.log(JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
