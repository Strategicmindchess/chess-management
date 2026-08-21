import { prisma } from '../src/lib/prisma';

async function checkFloraRuns() {
  const student = await prisma.studentProfile.findFirst({
    where: { chessAccount: { chessComUsername: 'Floraaheree' } },
    include: {
      syncRuns: {
        orderBy: { completedAt: 'desc' },
        take: 5
      }
    }
  });

  console.log('Flora sync runs:');
  console.log(student?.syncRuns);
}

checkFloraRuns().catch(console.error).finally(() => prisma.$disconnect());
