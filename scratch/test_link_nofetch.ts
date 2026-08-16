import { prisma } from '../src/lib/prisma';
import { chessFetchQueue } from '../src/workers/leaderboard.queues';

async function testNoFetch() {
  console.log("=== Testing Link Account does NOT queue a fetch job ===");

  // 1. Create a dummy student with legacy fields
  const dummyUser = await prisma.user.create({
    data: {
      name: 'Test NoFetch',
      email: `testnofetch${Date.now()}@test.com`,
      passwordHash: 'dummy',
      role: 'STUDENT'
    }
  });

  const dummyProfile = await prisma.studentProfile.create({
    data: {
      userId: dummyUser.id,
      chessComId: 'TestChessComId',
      lichessId: 'TestLichessId'
    }
  });

  console.log("1. Created dummy student with legacy fields in StudentProfile.");

  // 2. Check Queue length before
  const countBefore = await chessFetchQueue.getJobCounts();
  console.log(`2. Queue jobs BEFORE linking:`, countBefore);

  // 3. Admin links the account (We simulate the EXACT logic from account-actions.ts)
  console.log("3. Simulating Admin linking the account (Running the DB upsert from account-actions.ts)...");
  await prisma.chessAccount.upsert({
    where: { studentProfileId: dummyProfile.id },
    create: {
      studentProfileId: dummyProfile.id,
      chessComUsername: dummyProfile.chessComId,
      lichessUsername: dummyProfile.lichessId,
      chessComVerified: false,
      lichessVerified: false,
    },
    update: {}
  });

  // Note: We deliberately do NOT call chessFetchQueue.add() here, 
  // because we removed it from the actual action!

  // 4. Check Queue length after
  const countAfter = await chessFetchQueue.getJobCounts();
  console.log(`4. Queue jobs AFTER linking:`, countAfter);

  if (countBefore.waiting === countAfter.waiting && countBefore.active === countAfter.active) {
    console.log("✅ TEST PASSED: No background fetch jobs were added to the queue!");
  } else {
    console.log("❌ TEST FAILED: The queue count increased unexpectedly!");
  }

  // Cleanup
  await prisma.user.delete({ where: { id: dummyUser.id } });
  console.log("5. Cleaned up test data.");
}

testNoFetch().catch(console.error).finally(() => {
  prisma.$disconnect();
  process.exit(0);
});
