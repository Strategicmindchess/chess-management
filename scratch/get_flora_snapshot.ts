import { prisma } from '../src/lib/prisma';

async function getFloraSnapshot() {
  const snap = await prisma.chessActivitySnapshot.findFirst({
    where: {
      student: { chessAccount: { chessComUsername: 'Floraaheree' } },
      periodType: 'MONTHLY'
    }
  });
  console.log('Flora Snapshot in DB:');
  console.log(snap);
}

getFloraSnapshot().catch(console.error).finally(() => prisma.$disconnect());
