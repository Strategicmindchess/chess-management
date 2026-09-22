import { PrismaClient } from '@prisma/client';
import { processPendingPenalties } from '../src/workers/penalty.worker';
import { calculatePenalty } from '../src/lib/penalty-engine';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding feedback and running penalty worker...");

  // 1. Find a class log to seed
  // Let's just find the first COMPLETED class log
  const classLog = await prisma.classLog.findFirst({
    where: {
      classInstance: { status: 'COMPLETED' },
    },
    include: {
      batch: { include: { students: true } },
      coach: true,
      classInstance: true
    },
  });

  if (!classLog) {
    console.error("No COMPLETED class logs found! Run integration tests or create one first.");
    return;
  }

  console.log(`Found ClassLog: ${classLog.id} for Batch: ${classLog.batch.name}`);

  const batchId = classLog.batchId;
  let students = classLog.batch.students;

  // 2. Ensure batch has some students
  if (students.length === 0) {
    console.log("Batch has no students. Creating dummy students...");
    // Find or create some student profiles
    const studentUsers = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      take: 5
    });
    
    if (studentUsers.length === 0) {
      console.error("No student users found in DB!");
      return;
    }

    for (const u of studentUsers) {
      const sp = await prisma.studentProfile.upsert({
        where: { userId: u.id },
        update: {},
        create: {
          userId: u.id,
          parentName: "Parent of " + u.name,
          parentPhone: "1234567890",
          studentPhone: "0987654321",
          city: "Test City",
          chessComId: null,
          lichessId: null,
          currentRating: 1000,
          coachProfileId: classLog.coachProfileId,
          batchId: batchId,
          joiningDate: new Date(),
          monthlyFeeAmount: 2000,
          perSessionFeeAmount: 500,
        }
      });
      
      await prisma.batchStudent.create({
        data: {
          batchId: batchId,
          studentProfileId: sp.id
        }
      });
    }

    // Refresh students
    const updatedBatch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { students: true }
    });
    students = updatedBatch?.students || [];
    console.log(`Added ${students.length} students to batch.`);
  }

  // 3. Add Feedback for these students (e.g., 3/5 with camera/phone issues)
  console.log("Adding feedback for students...");
  
  // Clear old feedback for this class
  await prisma.classFeedback.deleteMany({
    where: { classLogId: classLog.id }
  });

  let i = 0;
  for (const s of students) {
    // Only 3 students submit feedback
    if (i >= 3) break;
    
    const cameraOff = (i === 0 || i === 1); // 2 out of 3 say camera was off
    const phoneUsed = (i === 0); // 1 out of 3 say phone used

    await prisma.classFeedback.create({
      data: {
        classLogId: classLog.id,
        studentProfileId: s.studentProfileId,
        cameraOffOver5Min: cameraOff,
        phoneUsedOver4Times: phoneUsed,
        classQualityScore: 8,
        conceptUnderstood: true,
        overallCoachScore: 8,
      }
    });
    i++;
  }
  
  console.log("Feedback seeded.");

  // 4. Force the class to be > 48h old so the worker will process it
  // Wait, if it's not 48h old, the worker skips it. Let's spoof the completion time.
  console.log("Spoofing class instance time to make it > 48h old...");
  const oldDate = new Date(Date.now() - (50 * 60 * 60 * 1000)); // 50 hours ago
  
  await prisma.classInstance.update({
    where: { id: classLog.classInstanceId },
    data: { 
      endTime: oldDate,
      startedAt: oldDate,
    }
  });
  
  await prisma.classLog.update({
    where: { id: classLog.id },
    data: {
      attendanceMarkedAt: new Date(oldDate.getTime() + 10 * 60 * 1000), // marked 10 mins later
      coachJoinedAt: oldDate,
    }
  });
  
  // We should also clear any existing penaltyCalculatedAt to ensure it processes again
  await prisma.classLog.update({
    where: { id: classLog.id },
    data: {
      penaltyCalculatedAt: null,
      penaltyAmount: 0,
      penaltyNote: null,
    }
  });

  // 5. Run the penalty worker!
  console.log("Running processPendingPenalties()...");
  await processPendingPenalties(prisma as any);
  
  // 6. Verify output
  const finalLog = await prisma.classLog.findUnique({
    where: { id: classLog.id }
  });
  
  console.log("Final Penalty Status:");
  console.log(`Amount: ₹${finalLog?.penaltyAmount}`);
  console.log(`Note: ${finalLog?.penaltyNote}`);
  console.log(`Calculated At: ${finalLog?.penaltyCalculatedAt}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
