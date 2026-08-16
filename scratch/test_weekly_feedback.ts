import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';
import { leaderboardCalcQueue } from '../src/workers/leaderboard.queues';

async function runWeeklyFeedbackTest() {
  console.log("=== Testing Weekly Coach Feedback ===");

  // 1. Get the current WEEKLY period
  const { periodStart, periodEnd } = getCurrentPeriod('WEEKLY');
  console.log(`Current WEEKLY period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

  // 2. Find Nikhilesh
  const student = await prisma.studentProfile.findFirst({
    where: { user: { name: { contains: 'Nikhilesh', mode: 'insensitive' } } },
    include: { user: true }
  });

  if (!student) {
    console.error("❌ Nikhilesh not found!");
    return;
  }
  console.log(`Found student: ${student.user.name}`);

  // --- NEW: Insert a dummy snapshot so the calculator DOES NOT skip him! ---
  await prisma.chessActivitySnapshot.upsert({
    where: {
      studentProfileId_periodType_periodStart: {
        studentProfileId: student.id,
        periodType: 'WEEKLY',
        periodStart: periodStart,
      }
    },
    create: {
      studentProfileId: student.id,
      periodType: 'WEEKLY',
      periodStart: periodStart,
      periodEnd: periodEnd,
      rapidGames: 0,
      blitzGames: 0,
      bulletGames: 0,
      classicalGames: 0,
      ultraBulletGames: 0,
      rapidWins: 0,
      blitzWins: 0,
      puzzleAttempts: 0,
      puzzleSolved: 0,
      rapidRatingStart: 1000,
      rapidRatingEnd: 1000,
    },
    update: {} // do nothing if it already exists
  });
  console.log("✅ Ensured a ChessActivitySnapshot exists so the calculator doesn't skip him.");

  // 3. Find or create a dummy coach
  let coach = await prisma.coachProfile.findFirst();
  if (!coach) {
    const u = await prisma.user.create({
      data: { name: 'Test Coach', email: 'coach@test.com', passwordHash: 'x', role: 'TEACHER' }
    });
    coach = await prisma.coachProfile.create({ data: { userId: u.id } });
  }

  // 4. Insert or Update a PERFECT Coach Feedback (10 in all categories = 50 marks)
  await prisma.coachFeedback.upsert({
    where: {
      studentProfileId_coachId_periodType_periodStart: {
        coachId: coach.id,
        studentProfileId: student.id,
        periodType: 'WEEKLY',
        periodStart: periodStart,
      }
    },
    create: {
      coachId: coach.id,
      studentProfileId: student.id,
      periodType: 'WEEKLY',
      periodStart: periodStart,
      engagement: 10,
      behaviour: 10,
      conceptAdoption: 10,
      joiningOnTime: 10,
      cameraOn: 10,
      remarks: 'Excellent weekly performance!'
    },
    update: {
      engagement: 10,
      behaviour: 10,
      conceptAdoption: 10,
      joiningOnTime: 10,
      cameraOn: 10,
      remarks: 'Excellent weekly performance (updated)!'
    }
  });

  console.log("✅ Inserted PERFECT Weekly Coach Feedback (50/50 marks) into Database.");

  // 5. Run the Leaderboard Calculation by adding a job to the queue
  console.log("Adding calc job to queue for WEEKLY period...");
  
  await leaderboardCalcQueue.add('calc-leaderboard', {
    periodType: 'WEEKLY',
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  });

  console.log("Waiting 3 seconds for the Next.js dev server background worker to process it...");
  await new Promise(r => setTimeout(r, 3000));

  // 6. Fetch the result
  const entry = await prisma.leaderboardEntry.findUnique({
    where: {
      studentProfileId_periodType_periodStart: {
        studentProfileId: student.id,
        periodType: 'WEEKLY',
        periodStart: periodStart,
      }
    }
  });

  if (entry) {
    console.log("\n📊 --- WEEKLY REPORT ---");
    console.log(`Student: ${student.user.name}`);
    console.log(`Period: WEEKLY (${periodStart.toISOString().split('T')[0]})`);
    console.log(`Coach Feedback Score: ${entry.coachFeedback} / 50`);
    console.log(`Total Score: ${entry.totalScore}`);
    
    if (entry.coachFeedback === 50) {
      console.log("\n✅ SUCCESS: The worker successfully read the Weekly Coach Feedback and added 50 marks!");
    } else {
      console.log("\n❌ FAILED: The coach feedback score was not exactly 50.");
    }
  } else {
    console.log("❌ FAILED: The student did not get a Leaderboard Entry.");
  }
}

runWeeklyFeedbackTest().catch(console.error).finally(() => {
  prisma.$disconnect();
  process.exit(0);
});
