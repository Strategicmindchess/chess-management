import { prisma } from '../src/lib/prisma';

async function checkFlora() {
  const student = await prisma.studentProfile.findFirst({
    where: { chessAccount: { chessComUsername: 'Floraaheree' } }
  });

  const snapshot = await prisma.chessActivitySnapshot.findFirst({
    where: { studentProfileId: student.id, periodType: 'MONTHLY' },
    orderBy: { periodStart: 'desc' }
  });

  console.log("\n=== Latest MONTHLY Snapshot Data ===");
  console.log(snapshot);
}

checkFlora().catch(console.error).finally(() => prisma.$disconnect());
