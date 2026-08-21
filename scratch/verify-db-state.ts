import { prisma } from '../src/lib/prisma';

async function verifyState() {
  const snapshots = await prisma.chessActivitySnapshot.findMany({
    where: { periodType: 'MONTHLY', periodStart: new Date('2026-08-01T00:00:00.000Z') },
    select: {
      studentProfileId: true,
      updatedAt: true,
      rapidGames: true,
      blitzGames: true,
      puzzleSolved: true,
      student: {
        select: {
          user: { select: { name: true } },
          chessAccount: {
            select: {
              chessComUsername: true,
              lichessUsername: true
            }
          }
        }
      }
    }
  });

  console.log(`\n--- Snapshot Data Review ---`);
  
  let validUpdates = 0;
  let zeros = 0;

  for (const s of snapshots) {
    const isZero = s.rapidGames === 0 && s.blitzGames === 0 && s.puzzleSolved === 0;
    
    // Explicitly check Naman
    if (s.student.user.name.includes('NAMAN') || s.student.chessAccount?.chessComUsername?.includes('Naman')) {
        console.log(`[NAMAN] Data: R=${s.rapidGames} B=${s.blitzGames} P=${s.puzzleSolved} | UpdatedAt: ${s.updatedAt.toISOString()}`);
    }

    if (!isZero) {
        validUpdates++;
    } else {
        zeros++;
        console.log(`[ZERO] ${s.student.user.name.padEnd(20)} | Data: R=${s.rapidGames} B=${s.blitzGames}`);
    }
  }

  console.log(`\nValid Non-Zero Updates: ${validUpdates}`);
  console.log(`Genuinely Zero Updates: ${zeros}`);
}

verifyState()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
