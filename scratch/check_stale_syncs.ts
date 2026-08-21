import { prisma } from '../src/lib/prisma';

async function main() {
  const periodStart = new Date('2026-08-01T00:00:00.000Z');
  
  // Get all active students with a lichess ID
  const students = await prisma.studentProfile.findMany({
    where: {
      lichessId: { not: null },
      user: { isActive: true }
    },
    include: {
      user: true
    }
  });

  console.log(`Found ${students.length} active students with Lichess accounts.`);

  const staleSyncs = [];
  const noSnapshot = [];

  for (const student of students) {
    const snapshot = await prisma.chessActivitySnapshot.findFirst({
      where: {
        studentProfileId: student.id,
        periodType: 'MONTHLY',
        periodStart: periodStart
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (!snapshot) {
      noSnapshot.push(student.user.name);
      continue;
    }

    // Check if the snapshot was fetched recently
    const now = new Date('2026-08-20T00:00:00.000Z').getTime();
    const fetchedTime = snapshot.fetchedAt ? new Date(snapshot.fetchedAt).getTime() : 0;
    const daysSinceSync = Math.floor((now - fetchedTime) / (1000 * 60 * 60 * 24));

    // If it hasn't been fetched in the last 2 days
    if (daysSinceSync > 1) {
      staleSyncs.push({
        name: student.user.name,
        lichessId: student.lichessId,
        lastFetch: snapshot.fetchedAt ? snapshot.fetchedAt.toISOString().split('T')[0] : 'Never',
        daysSince: daysSinceSync
      });
    }
  }

  console.log(`\nStudents with missing snapshots for this month: ${noSnapshot.length}`);
  if (noSnapshot.length > 0) {
    console.log(noSnapshot.join(', '));
  }

  console.log(`\nStudents whose data hasn't been synced in over a day: ${staleSyncs.length}`);
  if (staleSyncs.length > 0) {
    console.table(staleSyncs);
  }

  if (staleSyncs.length > 0 || noSnapshot.length > 0) {
    console.log("\nThere might be an issue with the background cron job that fetches data.");
  } else {
    console.log("\nEveryone's data is relatively up to date.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
