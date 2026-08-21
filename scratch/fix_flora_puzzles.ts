import { prisma } from '../src/lib/prisma';

async function fixFloraPuzzles() {
  const snap = await prisma.chessActivitySnapshot.update({
    where: {
      studentProfileId_periodType_periodStart: {
        studentProfileId: 'cms058awk000004jlepfh1d01',
        periodType: 'MONTHLY',
        periodStart: new Date('2026-08-01T00:00:00.000Z')
      }
    },
    data: {
      puzzleAttempts: 179,
      puzzleSolved: 119
    }
  });

  console.log('Updated puzzle data for Flora:');
  console.log(`puzzleSolved: ${snap.puzzleSolved}, puzzleAttempts: ${snap.puzzleAttempts}`);
  console.log(`updatedAt: ${snap.updatedAt}`);
}

fixFloraPuzzles().catch(console.error).finally(() => prisma.$disconnect());
