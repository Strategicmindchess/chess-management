import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const period = getCurrentPeriod('MONTHLY');
  const entries = await prisma.leaderboardEntry.findMany({
    where: { periodType: 'MONTHLY', periodStart: period.periodStart },
    include: { student: { include: { user: true } } },
    orderBy: { rank: 'asc' },
  });

  console.log(`\n=============================================================`);
  console.log(` CURRENT DATABASE LEADERBOARD ENTRIES (${entries.length} students)`);
  console.log(`=============================================================`);
  for (const e of entries) {
    console.log(
      `Rank ${String(e.rank).padStart(2)}: ${e.student.user.name.padEnd(25)} ` +
      `Score: ${String(e.totalScore).padStart(4)} | Att: ${e.attendance} | Asg: ${e.assignment} | Streak: ${e.consistencyBonus}`
    );
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
