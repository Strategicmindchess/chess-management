import { prisma } from '../src/lib/prisma';

const LATE_JOIN_PENALTY = (lateMinutes: number): number => {
  if (lateMinutes <= 2) return 0;
  if (lateMinutes <= 5) return 100;
  if (lateMinutes <= 10) return 200;
  return 500;
};
const ATTENDANCE_DELAY_PENALTY = 200;
const CAMERA_OFF_PENALTY = 150;
const PHONE_USE_PENALTY = 250;

async function main() {
  console.log("🌱 Seeding Dummy Penalty Data...");

  // 1. Create a dummy Coach
  const coachUser = await prisma.user.create({
    data: {
      name: "Dummy Coach Penalty Tester",
      email: `dummy.coach.${Date.now()}@test.com`,
      role: "TEACHER",
      coachProfile: {
        create: {
          city: "Test City",
          tdsApplicable: false,
        }
      }
    },
    include: { coachProfile: true }
  });
  const coachProfileId = coachUser.coachProfile!.id;
  console.log(`✅ Created Coach: ${coachUser.name}`);

  // 2. Create a dummy Student
  const studentUser = await prisma.user.create({
    data: {
      name: "Dummy Student Penalty Tester",
      email: `dummy.student.${Date.now()}@test.com`,
      role: "STUDENT",
      studentProfile: {
        create: {
          assignedCoachId: coachProfileId,
        }
      }
    },
    include: { studentProfile: true }
  });
  const studentProfileId = studentUser.studentProfile!.id;
  console.log(`✅ Created Student: ${studentUser.name}`);

  // 3. Create a Batch
  const batch = await prisma.batch.create({
    data: {
      name: "Penalty Test Batch",
      code: `PTB-${Date.now()}`,
      meetLink: "https://meet.google.com/test",
      coachProfileId: coachProfileId,
      students: {
        create: [{ studentProfileId: studentProfileId }]
      }
    }
  });
  console.log(`✅ Created Batch: ${batch.name}`);

  const today = new Date();
  
  // ─────────────────────────────────────────────────────────────────
  // SCENARIO 1: Late Join Penalty (6 mins late -> ₹200)
  // ─────────────────────────────────────────────────────────────────
  const scheduledDate1 = new Date(today);
  scheduledDate1.setHours(10, 0, 0, 0); // Scheduled at 10:00
  const joinDate1 = new Date(scheduledDate1);
  joinDate1.setMinutes(6); // Joined at 10:06

  const instance1 = await prisma.classInstance.create({
    data: {
      batchId: batch.id,
      date: scheduledDate1,
      startTime: "10:00",
      endTime: "11:00",
      status: "COMPLETED"
    }
  });

  const log1 = await prisma.classLog.create({
    data: {
      batchId: batch.id,
      coachProfileId: coachProfileId,
      date: scheduledDate1,
      topicCovered: "Scenario 1: Late Join",
      durationMins: 60,
      coachJoinedAt: joinDate1, // 6 mins late
      classInstance: { connect: { id: instance1.id } }
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // SCENARIO 2: Attendance Delay (Marked 26 hours later -> ₹200)
  // ─────────────────────────────────────────────────────────────────
  const scheduledDate2 = new Date(today);
  scheduledDate2.setDate(today.getDate() - 2); // 2 days ago
  scheduledDate2.setHours(14, 0, 0, 0); // Scheduled at 14:00

  const instance2 = await prisma.classInstance.create({
    data: {
      batchId: batch.id,
      date: scheduledDate2,
      startTime: "14:00",
      endTime: "15:00",
      status: "COMPLETED"
    }
  });

  const markedDate2 = new Date(scheduledDate2);
  markedDate2.setHours(markedDate2.getHours() + 26); // Marked 26 hours late

  const log2 = await prisma.classLog.create({
    data: {
      batchId: batch.id,
      coachProfileId: coachProfileId,
      date: scheduledDate2,
      topicCovered: "Scenario 2: Delayed Attendance",
      durationMins: 60,
      attendanceMarkedAt: markedDate2,
      classInstance: { connect: { id: instance2.id } }
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // SCENARIO 3: Student Feedback Penalty (Camera Off + Phone Use)
  // ─────────────────────────────────────────────────────────────────
  const scheduledDate3 = new Date(today);
  scheduledDate3.setHours(16, 0, 0, 0);

  const instance3 = await prisma.classInstance.create({
    data: {
      batchId: batch.id,
      date: scheduledDate3,
      startTime: "16:00",
      endTime: "17:00",
      status: "COMPLETED"
    }
  });

  const log3 = await prisma.classLog.create({
    data: {
      batchId: batch.id,
      coachProfileId: coachProfileId,
      date: scheduledDate3,
      topicCovered: "Scenario 3: Feedback Penalties",
      durationMins: 60,
      classInstance: { connect: { id: instance3.id } }
    }
  });

  // Student submits feedback: Camera Off
  await prisma.classFeedback.create({
    data: {
      classLogId: log3.id,
      studentProfileId: studentProfileId,
      cameraOffOver5Min: true, // Expect ₹150 penalty
      phoneUsedOver4Times: true, // Requires 3+ feedbacks to trigger 250 penalty
      classQualityScore: 3,
      overallCoachScore: 2
    }
  });

  // Create 2 more dummy feedbacks to trigger phone use threshold (requires 3 reports)
  for (let i = 0; i < 2; i++) {
    const dummyStudent = await prisma.studentProfile.create({
      data: {
        user: {
          create: { name: `Extra Student ${i}`, email: `extra.${i}.${Date.now()}@test.com`, role: "STUDENT" }
        }
      }
    });
    await prisma.classFeedback.create({
      data: {
        classLogId: log3.id,
        studentProfileId: dummyStudent.id,
        phoneUsedOver4Times: true, // Contributes to the 3 reports
      }
    });
  }


  // ─────────────────────────────────────────────────────────────────
  // CALCULATE PENALTIES USING SHARED LOGIC
  // ─────────────────────────────────────────────────────────────────
  console.log("\n⚙️ Calculating Penalties...\n");

  const processLog = async (logId: string) => {
    const log = await prisma.classLog.findUnique({
      where: { id: logId },
      include: { classInstance: true, classFeedbacks: true },
    });
    if (!log) return;

    let totalPenalty = 0;
    const reasons: string[] = [];

    // 1. Late join
    if (log.coachJoinedAt && log.classInstance) {
      const scheduledStart = new Date(`${log.classInstance.date.toISOString().slice(0, 10)}T${log.classInstance.startTime}`);
      const lateMs = log.coachJoinedAt.getTime() - scheduledStart.getTime();
      const lateMinutes = Math.max(0, Math.floor(lateMs / 60000));
      const latePenalty = LATE_JOIN_PENALTY(lateMinutes);
      if (latePenalty > 0) {
        totalPenalty += latePenalty;
        reasons.push(`Late join: ${lateMinutes} min late (₹${latePenalty})`);
      }
    }

    // 2. Attendance delay
    if (log.attendanceMarkedAt && log.date) {
      const hoursDelay = (log.attendanceMarkedAt.getTime() - log.date.getTime()) / 3600000;
      if (hoursDelay > 24) {
        totalPenalty += ATTENDANCE_DELAY_PENALTY;
        reasons.push(`Attendance marked ${Math.floor(hoursDelay)}h late (₹${ATTENDANCE_DELAY_PENALTY})`);
      }
    }

    // 3. Feedback
    const cameraOffCount = log.classFeedbacks.filter(f => f.cameraOffOver5Min).length;
    const phoneUsedCount = log.classFeedbacks.filter(f => f.phoneUsedOver4Times).length;

    if (cameraOffCount > 0) {
      totalPenalty += CAMERA_OFF_PENALTY * cameraOffCount;
      reasons.push(`Camera off >5min (${cameraOffCount} reports, ₹${CAMERA_OFF_PENALTY * cameraOffCount})`);
    }

    if (phoneUsedCount >= 3) {
      totalPenalty += PHONE_USE_PENALTY;
      reasons.push(`Phone usage >4 times (₹${PHONE_USE_PENALTY})`);
    }

    await prisma.classLog.update({
      where: { id: logId },
      data: { penaltyAmount: totalPenalty, penaltyNote: reasons.join("; ") || null },
    });

    console.log(`Results for [${log.topicCovered}]:`);
    console.log(`  - Total Penalty: ₹${totalPenalty}`);
    console.log(`  - Note: ${reasons.join("; ") || "None"}\n`);
  };

  await processLog(log1.id);
  await processLog(log2.id);
  await processLog(log3.id);

  console.log("🔗 You can check this dummy coach in the Admin Panel!");
  console.log(`   URL: http://localhost:3000/admin/users/${coachUser.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
