import { prisma } from '../src/lib/prisma';
import { processChessFetch } from '../src/workers/chess-fetch.worker';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';
import { processLeaderboardCalc } from '../src/workers/leaderboard-calc.worker';

async function syncAndCalcAll() {
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');

  console.log('Fetching all students with linked accounts...');
  const students = await prisma.studentProfile.findMany({
    where: {
      chessAccount: {
        OR: [
          { chessComUsername: { not: null } },
          { lichessUsername: { not: null } },
        ],
      },
    },
    include: {
      user: { select: { name: true } },
      chessAccount: true,
    },
  });

  console.log(`Found ${students.length} students to sync.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    console.log(`[${i + 1}/${students.length}] Syncing ${s.user.name} (CC: ${s.chessAccount?.chessComUsername}, LI: ${s.chessAccount?.lichessUsername})...`);
    
    const mockJob: any = {
      data: {
        studentProfileId: s.id,
        chessComUsername: s.chessAccount?.chessComUsername,
        lichessUsername: s.chessAccount?.lichessUsername,
        periodType: 'MONTHLY',
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
      log: async (msg: string) => {},
      updateProgress: async (p: number) => {},
    };

    try {
      const res = await processChessFetch(mockJob);
      if (res && 'puzzleSolved' in res) {
        console.log(`  -> OK: Rapid: ${res.rapidGames}, Blitz: ${res.blitzGames}, Puzzles: ${res.puzzleSolved}/${res.puzzleAttempts}`);
        updated++;
      } else {
        console.log(`  -> Skipped`);
        skipped++;
      }
    } catch (err: any) {
      console.log(`  -> Preserved / Error: ${err.message}`);
      failed++;
    }

    // small delay to prevent rate limits
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`\nSync Summary: ${updated} updated, ${failed} failed/preserved, ${skipped} skipped`);

  console.log('\nNow recalculating leaderboard scores for all students...');
  const calcMockJob: any = {
    name: 'calc-leaderboard',
    data: {
      periodType: 'MONTHLY',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
    log: async () => {},
    updateProgress: async () => {},
  };

  const calcRes = await processLeaderboardCalc(calcMockJob);
  console.log('Leaderboard recalculated:', calcRes);

  const topEntries = await prisma.leaderboardEntry.findMany({
    where: { periodType: 'MONTHLY' },
    orderBy: { rank: 'asc' },
    take: 10,
    include: {
      student: {
        include: { user: { select: { name: true } } }
      }
    }
  });

  console.log('\n=== Top 10 Leaderboard Entries ===');
  for (const e of topEntries) {
    console.log(`#${e.rank} ${e.student.user.name} - Total: ${e.totalScore} pts (Puzzles: ${e.puzzlePoints} pts, R+C: ${e.rapidClassicalPoints} pts, Blitz: ${e.blitzPoints} pts)`);
  }
}

syncAndCalcAll().catch(console.error).finally(() => prisma.$disconnect());
