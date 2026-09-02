import { prisma } from '../src/lib/prisma';

async function main() {
  const entries = await prisma.leaderboardEntry.findMany({
    where: {
      periodType: 'MONTHLY',
      periodStart: {
        gte: new Date('2026-08-01T00:00:00Z'),
        lt: new Date('2026-09-01T00:00:00Z')
      },
      isDisqualified: false
    },
    orderBy: [
      { rank: 'asc' },
      { totalScore: 'desc' }
    ],
    take: 10,
    include: {
      student: {
        include: {
          user: true
        }
      }
    }
  });

  console.log("Top 10 Students for August Leaderboard:\n");
  entries.forEach((e, i) => {
    console.log(`${i + 1}. Rank ${e.rank ?? '?'} | Score: ${e.totalScore} | ${e.student.user.name}`);
  });
}

main().finally(() => prisma.$disconnect());
