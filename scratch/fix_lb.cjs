const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const periodStart = new Date('2026-08-01T00:00:00.000Z');
  const periodType = 'MONTHLY';
  console.log(`Running manual fix for ${periodType} starting ${periodStart}`);

  const students = await prisma.studentProfile.findMany({
    where: { user: { isActive: true, role: 'STUDENT' } },
  });
  console.log(`Active students: ${students.length}`);

  const snapshots = await prisma.chessActivitySnapshot.findMany({
    where: { periodType, periodStart },
  });
  console.log(`Snapshots: ${snapshots.length}`);

  let upsertCount = 0;
  for (const snap of snapshots) {
    try {
      await prisma.leaderboardEntry.upsert({
        where: {
          studentProfileId_periodType_periodStart: {
            studentProfileId: snap.studentProfileId,
            periodType,
            periodStart
          }
        },
        create: {
          studentProfileId: snap.studentProfileId,
          periodType,
          periodStart,
          totalScore: snap.puzzleSolved > 0 ? 50 : 0, // dummy score for testing
          rank: 1,
          rankChange: 0,
        },
        update: {
          totalScore: snap.puzzleSolved > 0 ? 50 : 0,
          rank: 1,
        }
      });
      upsertCount++;
    } catch (e) {
      console.error(`Failed to upsert student ${snap.studentProfileId}:`, e);
    }
  }

  console.log(`Successfully upserted ${upsertCount} entries.`);
  
  const entries = await prisma.leaderboardEntry.findMany({
     where: { periodType, periodStart }
  });
  console.log(`Total entries in DB for this period: ${entries.length}`);
}

fix().catch(console.error).finally(() => prisma.$disconnect());
