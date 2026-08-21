import { prisma } from '../src/lib/prisma';

async function checkFlora() {
  const student = await prisma.studentProfile.findFirst({
    where: {
      chessAccount: {
        OR: [
          { chessComUsername: 'Floraaheree' },
          { lichessUsername: 'Itz_Flora' }
        ]
      }
    },
    include: {
      user: true,
      chessAccount: true,
      syncRuns: {
        orderBy: { completedAt: 'desc' },
        take: 3
      },
      stats: true
    }
  });

  if (!student) {
    console.log("Student not found");
    return;
  }

  console.log("=== Flora's Profile ===");
  console.log("Name:", student.user.name);
  console.log("Chess Accounts:", student.chessAccount);

  console.log("\n=== Recent Sync Runs ===");
  student.syncRuns.forEach(run => {
    console.log(`[${run.completedAt.toISOString()}] Status: ${run.status}, CC: ${run.chessComState}, LI: ${run.lichessState}`);
    if (run.error) console.log(`  Error: ${run.error}`);
  });

  const snapshot = await prisma.chessActivitySnapshot.findFirst({
    where: { studentProfileId: student.id },
    orderBy: { periodStart: 'desc' }
  });

  console.log("\n=== Latest Snapshot Data ===");
  console.log(snapshot);
}

checkFlora().catch(console.error).finally(() => prisma.$disconnect());
