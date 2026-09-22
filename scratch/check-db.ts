import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const count = await prisma.leaderboardEntry.count({
    where: { periodType: 'MONTHLY' }
  });
  const recent = await prisma.leaderboardEntry.findMany({
    where: { periodType: 'MONTHLY' },
    select: { studentProfileId: true, periodStart: true }
  });
  console.log(`Total MONTHLY entries: ${count}`);
  const groups = new Map();
  for (const r of recent) {
    const d = r.periodStart.toISOString();
    groups.set(d, (groups.get(d) || 0) + 1);
  }
  console.log('Entries by periodStart:');
  console.log(groups);
  
  const snapCount = await prisma.chessActivitySnapshot.count({
    where: { periodType: 'MONTHLY' }
  });
  const snaps = await prisma.chessActivitySnapshot.findMany({
    where: { periodType: 'MONTHLY' },
    select: { periodStart: true }
  });
  console.log(`Total MONTHLY snapshots: ${snapCount}`);
  const snapGroups = new Map();
  for (const r of snaps) {
    const d = r.periodStart.toISOString();
    snapGroups.set(d, (snapGroups.get(d) || 0) + 1);
  }
  console.log('Snapshots by periodStart:');
  console.log(snapGroups);
}
run().finally(() => prisma.$disconnect());
