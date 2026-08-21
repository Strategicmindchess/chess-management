import { prisma } from '../src/lib/prisma';

async function checkFloraLeaderboard() {
  const flora = await prisma.studentProfile.findFirst({
    where: { chessAccount: { chessComUsername: 'Floraaheree' } },
    include: {
      user: true,
      leaderboardEntries: {
        where: { periodType: 'MONTHLY' },
        orderBy: { periodStart: 'desc' },
      }
    }
  });

  console.log('Flora Profile:', flora?.id, flora?.user?.name, flora?.user?.isActive, flora?.user?.role);
  console.log('Flora Leaderboard Entries:');
  console.log(flora?.leaderboardEntries);

  const allEntries = await prisma.leaderboardEntry.findMany({
    where: { periodType: 'MONTHLY' },
    orderBy: { rank: 'asc' },
    include: {
      student: { include: { user: true } }
    }
  });

  console.log('\nAll Monthly Leaderboard Ranks:');
  for (const e of allEntries) {
    console.log(`#${e.rank} ${e.student.user.name} (${e.totalScore} pts) - PeriodStart: ${e.periodStart.toISOString()}`);
  }
}

checkFloraLeaderboard().catch(console.error).finally(() => prisma.$disconnect());
