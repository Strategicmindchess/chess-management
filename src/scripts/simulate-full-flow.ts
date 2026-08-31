import { prisma } from '../lib/prisma';
import { calculatePenalty } from '../lib/penalty-engine';

async function simulateFlow() {
  console.log("=== STARTING FULL FLOW SIMULATION ===\n");

  const studentEmail = 'shivamgupta.dev12@gmail.com';
  const coachEmail = 'teacher@gmail.com';

  const studentUser = await prisma.user.findUnique({ where: { email: studentEmail }, include: { studentProfile: true } });
  const coachUser = await prisma.user.findUnique({ where: { email: coachEmail }, include: { coachProfile: true } });

  if (!studentUser?.studentProfile || !coachUser?.coachProfile) {
    console.error("Student or Coach profile not found.");
    return;
  }
  const studentProfileId = studentUser.studentProfile.id;
  const coachProfileId = coachUser.coachProfile.id;

  // 1. Create a Batch
  console.log("1. Creating Batch...");
  const batch = await prisma.batch.create({
    data: {
      name: "Manual Flow Test Batch",
      code: "FLOW-TEST-" + Date.now(),
      meetLink: "https://meet.google.com/flow-test",
      coachProfileId,
      type: "GROUP_SESSION",
      students: {
        create: { studentProfileId }
      }
    }
  });
  console.log(`[DB RESPONSE] Batch Created: ID ${batch.id}\n`);

  // 2. Coach Teaches Class & Marks Attendance (3 days ago)
  // We use 3 days ago so the penalty engine (48h rule) will process it immediately!
  console.log("2. Coach Marking Attendance (simulating class from 3 days ago)...");
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  threeDaysAgo.setUTCHours(10, 0, 0, 0); // EXACTLY 10:00 UTC

  const classInstance = await prisma.classInstance.create({
    data: {
      batchId: batch.id,
      date: threeDaysAgo,
      startTime: "10:00",
      endTime: "11:00",
      status: "COMPLETED",
      completedAt: new Date(threeDaysAgo.getTime() + 60 * 60 * 1000), // 11:00 UTC
    }
  });

  const classLog = await prisma.classLog.create({
    data: {
      batchId: batch.id,
      coachProfileId,
      classInstance: { connect: { id: classInstance.id } },
      date: threeDaysAgo,
      topicCovered: "Simulated Full Flow - Testing Penalties",
      durationMins: 60,
      coachJoinedAt: new Date(threeDaysAgo.getTime() + 6 * 60 * 1000), // Coach was 6 minutes late!
      attendanceMarkedAt: new Date(threeDaysAgo.getTime() + 60 * 60 * 1000), // Marked within 24h
      attendance: {
        create: {
          studentProfileId,
          status: "PRESENT",
        }
      }
    }
  });
  console.log(`[DB RESPONSE] ClassLog Created:`, JSON.stringify(classLog, null, 2), "\n");

  // 3. Student Submits Feedback
  console.log("3. Student Submitting Feedback (reporting Camera OFF and Phone Use)...");
  const feedback = await prisma.classFeedback.create({
    data: {
      classLogId: classLog.id,
      studentProfileId,
      cameraOffOver5Min: true,
      phoneUsedOver4Times: true,
      classQualityScore: 2,
      conceptUnderstood: false,
    }
  });
  console.log(`[DB RESPONSE] ClassFeedback Created:`, JSON.stringify(feedback, null, 2), "\n");

  // 4. Background Worker Calculates Penalty
  console.log("4. Worker Wakes Up & Calculates Penalty (since > 48 hours have passed)...");
  
  // Fetch exactly what the worker would fetch
  const fullLogForCalculation = await prisma.classLog.findUnique({
    where: { id: classLog.id },
    include: {
      classInstance: true,
      classFeedbacks: true,
      batch: { include: { students: true } }
    }
  });

  if (!fullLogForCalculation) return;

  const classDateStr = fullLogForCalculation.classInstance?.date.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const classScheduledStart = new Date(`${classDateStr}T${fullLogForCalculation.classInstance?.startTime ?? "10:00"}:00.000Z`);

  const engineInput = {
    coachJoinedAt: fullLogForCalculation.coachJoinedAt,
    classScheduledStart,
    attendanceMarkedAt: fullLogForCalculation.attendanceMarkedAt,
    classCompletedAt: fullLogForCalculation.createdAt,
    totalFeedbacksSubmitted: fullLogForCalculation.classFeedbacks.length,
    cameraOffReports: fullLogForCalculation.classFeedbacks.filter(f => f.cameraOffOver5Min).length,
    phoneUsageReports: fullLogForCalculation.classFeedbacks.filter(f => f.phoneUsedOver4Times).length,
    historicalPhonePenaltyCount: 0,
    totalStudents: fullLogForCalculation.batch.students.length,
  };

  const penaltyCalculation = calculatePenalty(engineInput);
  
  console.log("[ENGINE RESPONSE] Penalty Calculation Result:", JSON.stringify(penaltyCalculation, null, 2));

  // The worker saves it to the DB
  const finalizedLog = await prisma.classLog.update({
    where: { id: classLog.id },
    data: {
      penaltyAmount: penaltyCalculation.totalPenalty,
      penaltyNote: penaltyCalculation.breakdown.join("; "),
      penaltyCalculatedAt: new Date(),
    }
  });

  console.log(`\n[DB RESPONSE] ClassLog Finalized by Worker:`);
  console.log(`- Final Penalty Amount: ₹${finalizedLog.penaltyAmount}`);
  console.log(`- Calculated At: ${finalizedLog.penaltyCalculatedAt}`);
  console.log("\n=== FLOW COMPLETE ===");
  console.log(`You can now check Prisma Studio for ClassLog ID: ${classLog.id}`);
}

simulateFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
