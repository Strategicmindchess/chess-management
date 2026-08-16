import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const period = getCurrentPeriod('MONTHLY');

  const profile = await prisma.studentProfile.findFirst({
    where: { chessAccount: { chessComUsername: { equals: 'Fionaprincess1', mode: 'insensitive' } } },
    include: { chessAccount: true },
  });

  if (!profile) return console.log('Not found');

  const snap = await prisma.chessActivitySnapshot.findFirst({
    where: { studentProfileId: profile.id, periodType: 'MONTHLY', periodStart: period.periodStart },
  });

  console.log('=== Snapshot (what is stored in DB for this month) ===');
  console.log(snap);

  // Also check ChessApiFetchLog for Fiona
  const logs = await prisma.chessApiFetchLog.findMany({
    where: { studentProfileId: profile.id },
    orderBy: { fetchedAt: 'desc' },
    take: 3,
  });

  console.log('\n=== Last 3 API Fetch Logs ===');
  for (const l of logs) {
    console.log(`  fetchedAt: ${l.fetchedAt.toISOString()} | gameCount: ${l.gameCount} | periodStart: ${l.periodStart?.toISOString()} | success: ${l.success}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
