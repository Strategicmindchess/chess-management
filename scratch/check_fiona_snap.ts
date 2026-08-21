import { prisma } from '../src/lib/prisma';

async function checkFionaSnap() {
  const student = await prisma.studentProfile.findFirst({
    where: { chessAccount: { chessComUsername: 'Fionaprincess1' } },
    include: {
      activitySnapshots: {
        where: { periodType: 'MONTHLY' },
        orderBy: { periodStart: 'desc' },
        take: 1
      }
    }
  });

  console.log('Fiona Snapshot:');
  console.log(student?.activitySnapshots[0]);
}

checkFionaSnap().catch(console.error).finally(() => prisma.$disconnect());
