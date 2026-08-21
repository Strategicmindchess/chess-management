import { prisma } from '../src/lib/prisma';

async function main() {
  const oldDate = new Date('2026-07-31T18:30:00.000Z');
  const newDate = new Date('2026-08-01T00:00:00.000Z');

  console.log('Migrating from', oldDate.toISOString(), 'to', newDate.toISOString());

  const a = await prisma.leaderboardAttendance.updateMany({
    where: { periodStart: oldDate },
    data: { periodStart: newDate }
  });
  console.log('Updated attendances:', a.count);

  const b = await prisma.assignmentScore.updateMany({
    where: { periodStart: oldDate },
    data: { periodStart: newDate }
  });
  console.log('Updated assignments:', b.count);

  const c = await prisma.coachFeedback.updateMany({
    where: { periodStart: oldDate },
    data: { periodStart: newDate }
  });
  console.log('Updated feedback:', c.count);
  
  // Update old leaderboards just in case
  const d = await prisma.leaderboardEntry.updateMany({
    where: { periodStart: oldDate },
    data: { periodStart: newDate }
  });
  console.log('Updated leaderboard entries:', d.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
