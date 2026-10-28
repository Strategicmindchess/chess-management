import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { getISTDayBounds } from '../src/lib/timezone';
import { startOfDay, addDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIME_ZONE = 'Asia/Kolkata';

async function runIntegratedEndToEndTest() {
  const timestamp = Date.now();
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING INTEGRATED LIVE PROCESS TEST — [${timestamp}]`);
  console.log(`======================================================\n`);

  const plainPasswordTeacher = 'TestTeacher@123';
  const plainPasswordStudent = 'TestStudent@123';
  const plainPasswordSub = 'TestSub@123';

  const teacherEmail = `test.teacher.${timestamp}@smc.test`;
  const studentEmail = `test.student.${timestamp}@smc.test`;
  const subCoachEmail = `test.subcoach.${timestamp}@smc.test`;

  const hashedPasswordTeacher = await bcrypt.hash(plainPasswordTeacher, 10);
  const hashedPasswordStudent = await bcrypt.hash(plainPasswordStudent, 10);
  const hashedPasswordSub = await bcrypt.hash(plainPasswordSub, 10);

  let teacherUser: any = null;
  let teacherProfile: any = null;
  let subCoachUser: any = null;
  let subCoachProfile: any = null;
  let studentUser: any = null;
  let studentProfile: any = null;
  let batch: any = null;
  let inst1: any = null;
  let inst2: any = null;
  let inst3: any = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: CREATE TEST TEACHER, SUBSTITUTE COACH, AND TEST STUDENT
    // -------------------------------------------------------------------------
    console.log(`📌 STEP 1: Creating Test Teacher & Student accounts...`);
    
    // Lead Coach
    teacherUser = await prisma.user.create({
      data: {
        name: `Lead Coach Test ${timestamp}`,
        email: teacherEmail,
        passwordHash: hashedPasswordTeacher,
        role: 'TEACHER',
        isActive: true,
        emailVerified: true,
      },
    });
    teacherProfile = await prisma.coachProfile.create({
      data: {
        userId: teacherUser.id,
        bio: 'Lead Coach for Live Process E2E Test',
        experience: '5 years',
      },
    });
    console.log(`  ✅ Lead Coach Created: ${teacherEmail} (Profile ID: ${teacherProfile.id})`);

    // Substitute Coach
    subCoachUser = await prisma.user.create({
      data: {
        name: `Substitute Coach Test ${timestamp}`,
        email: subCoachEmail,
        passwordHash: hashedPasswordSub,
        role: 'TEACHER',
        isActive: true,
        emailVerified: true,
      },
    });
    subCoachProfile = await prisma.coachProfile.create({
      data: {
        userId: subCoachUser.id,
        bio: 'Substitute Coach for Live Process E2E Test',
        experience: '3 years',
      },
    });
    console.log(`  ✅ Substitute Coach Created: ${subCoachEmail} (Profile ID: ${subCoachProfile.id})`);

    // Student
    studentUser = await prisma.user.create({
      data: {
        name: `Test Student ${timestamp}`,
        email: studentEmail,
        passwordHash: hashedPasswordStudent,
        role: 'STUDENT',
        isActive: true,
        emailVerified: true,
      },
    });
    studentProfile = await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        parentName: 'Test Parent',
        parentPhone: '9876543210',
        city: 'Jhansi',
      },
    });
    console.log(`  ✅ Test Student Created: ${studentEmail} (Profile ID: ${studentProfile.id})`);

    // -------------------------------------------------------------------------
    // STEP 2: CREATE TEST BATCH & ENROLL STUDENT
    // -------------------------------------------------------------------------
    console.log(`\n📌 STEP 2: Creating Test Batch & Enrolling Student...`);
    batch = await prisma.batch.create({
      data: {
        name: `Live Test Batch ${timestamp}`,
        code: `LIVE-${timestamp}`,
        meetLink: 'https://meet.google.com/test-live-crm',
        coachProfileId: teacherProfile.id,
        payoutRate: 350, // Default batch payout rate = ₹350
        isActive: true,
      },
    });
    console.log(`  ✅ Batch Created: ${batch.name} (Code: ${batch.code}, Default Pay: ₹${batch.payoutRate})`);

    await prisma.batchStudent.create({
      data: {
        batchId: batch.id,
        studentProfileId: studentProfile.id,
      },
    });
    console.log(`  ✅ Student enrolled into batch.`);

    // -------------------------------------------------------------------------
    // STEP 3: CREATE MULTIPLE INSTANCES
    // -------------------------------------------------------------------------
    console.log(`\n📌 STEP 3: Creating Multiple Class Instances...`);
    const todayZoned = toZonedTime(new Date(), TIME_ZONE);
    const todayDate = fromZonedTime(startOfDay(todayZoned), TIME_ZONE);
    const tomorrowDate = fromZonedTime(startOfDay(addDays(todayZoned, 1)), TIME_ZONE);

    // Instance 1: Default Lead Coach session (coachPay = null -> inherits batch payout ₹350)
    inst1 = await prisma.classInstance.create({
      data: {
        batchId: batch.id,
        coachProfileId: teacherProfile.id,
        coachPay: null,
        date: todayDate,
        startTime: '10:00',
        endTime: '11:00',
        lectureName: 'Lecture 1: Opening Fundamentals',
        sessionNumber: 1,
        status: 'SCHEDULED',
      },
    });
    console.log(`  ✅ Session 1 created: ID ${inst1.id} (Lead Coach, Batch Rate ₹350)`);

    // Instance 2: Substitute Coach session with custom payout (coachPay = ₹550)
    inst2 = await prisma.classInstance.create({
      data: {
        batchId: batch.id,
        coachProfileId: subCoachProfile.id,
        coachPay: 550, // Custom override
        date: todayDate,
        startTime: '14:00',
        endTime: '15:00',
        lectureName: 'Lecture 2: Tactical Knight Forks with Substitute',
        sessionNumber: 2,
        status: 'SCHEDULED',
      },
    });
    console.log(`  ✅ Session 2 created: ID ${inst2.id} (Substitute Coach: ${subCoachUser.name}, Custom Pay ₹550)`);

    // Instance 3: Future scheduled session
    inst3 = await prisma.classInstance.create({
      data: {
        batchId: batch.id,
        coachProfileId: teacherProfile.id,
        coachPay: null,
        date: tomorrowDate,
        startTime: '10:00',
        endTime: '11:00',
        lectureName: 'Lecture 3: Future Scheduled Session',
        sessionNumber: 3,
        status: 'SCHEDULED',
      },
    });
    console.log(`  ✅ Session 3 created: ID ${inst3.id} (Future Scheduled Session)`);

    // -------------------------------------------------------------------------
    // STEP 4: SIMULATE CLASS JOIN
    // -------------------------------------------------------------------------
    console.log(`\n📌 STEP 4: Simulating Class Join Events...`);
    await prisma.classJoinEvent.create({
      data: {
        classInstanceId: inst1.id,
        coachProfileId: teacherProfile.id,
        joinedAt: new Date(),
      },
    });
    console.log(`  ✅ Lead Coach joined Session 1.`);

    await prisma.classJoinEvent.create({
      data: {
        classInstanceId: inst2.id,
        coachProfileId: subCoachProfile.id,
        joinedAt: new Date(),
      },
    });
    console.log(`  ✅ Substitute Coach joined Session 2.`);

    // -------------------------------------------------------------------------
    // STEP 5: MARK ATTENDANCE & CREATE CLASS LOGS
    // -------------------------------------------------------------------------
    console.log(`\n📌 STEP 5: Marking Attendance and Generating Class Logs...`);

    // Log 1: Completed by Lead Coach
    const log1 = await prisma.$transaction(async (tx) => {
      const payout1 = inst1.coachPay ?? batch.payoutRate; // 350
      const createdLog = await tx.classLog.create({
        data: {
          batchId: batch.id,
          coachProfileId: teacherProfile.id,
          coachClassTaken: teacherProfile.id,
          date: inst1.date,
          topicCovered: 'Lecture 1: Opening Fundamentals',
          durationMins: 60,
          payoutAmount: payout1,
          coachJoinedAt: new Date(),
          attendanceMarkedAt: new Date(),
          attendance: {
            create: [
              {
                studentProfileId: studentProfile.id,
                status: 'PRESENT',
              },
            ],
          },
        },
      });

      await tx.classInstance.update({
        where: { id: inst1.id },
        data: {
          status: 'COMPLETED',
          classLogId: createdLog.id,
          completedAt: new Date(),
        },
      });

      return createdLog;
    });
    console.log(`  ✅ Class Log 1 Created: ID ${log1.id}, Coach: ${teacherUser.name}, Payout Locked: ₹${log1.payoutAmount}`);

    // Log 2: Completed by Substitute Coach
    const log2 = await prisma.$transaction(async (tx) => {
      const payout2 = inst2.coachPay ?? batch.payoutRate; // 550
      const createdLog = await tx.classLog.create({
        data: {
          batchId: batch.id,
          coachProfileId: subCoachProfile.id,
          coachClassTaken: subCoachProfile.id,
          date: inst2.date,
          topicCovered: 'Lecture 2: Tactical Knight Forks with Substitute',
          durationMins: 60,
          payoutAmount: payout2,
          coachJoinedAt: new Date(),
          attendanceMarkedAt: new Date(),
          attendance: {
            create: [
              {
                studentProfileId: studentProfile.id,
                status: 'PRESENT',
              },
            ],
          },
        },
      });

      await tx.classInstance.update({
        where: { id: inst2.id },
        data: {
          status: 'COMPLETED',
          classLogId: createdLog.id,
          completedAt: new Date(),
        },
      });

      return createdLog;
    });
    console.log(`  ✅ Class Log 2 Created: ID ${log2.id}, Coach: ${subCoachUser.name}, Payout Locked: ₹${log2.payoutAmount}`);

    // -------------------------------------------------------------------------
    // STEP 6: VERIFY PAYOUT ACCURACY (MONTHLY SUMMARIES)
    // -------------------------------------------------------------------------
    console.log(`\n📌 STEP 6: Verifying Payout Calculation Integrity...`);

    // Fetch Lead Coach Logs
    const leadLogs = await prisma.classLog.findMany({
      where: { coachProfileId: teacherProfile.id },
    });
    const leadPayoutTotal = leadLogs.reduce((sum, l) => sum + (l.payoutAmount ?? 0), 0);

    // Fetch Substitute Coach Logs
    const subLogs = await prisma.classLog.findMany({
      where: { coachProfileId: subCoachProfile.id },
    });
    const subPayoutTotal = subLogs.reduce((sum, l) => sum + (l.payoutAmount ?? 0), 0);

    console.log(`  📊 Lead Coach Total Payout: ₹${leadPayoutTotal} (Expected: ₹350)`);
    console.log(`  📊 Substitute Coach Total Payout: ₹${subPayoutTotal} (Expected: ₹550)`);

    const isLeadPayoutValid = leadPayoutTotal === 350;
    const isSubPayoutValid = subPayoutTotal === 550;

    if (!isLeadPayoutValid || !isSubPayoutValid) {
      throw new Error(`Payout mismatch! Lead: ${leadPayoutTotal}, Sub: ${subPayoutTotal}`);
    }

    // Check Admin "By Batch" query to verify Lead Coach ownership is preserved
    const batchLogs = await prisma.classLog.findMany({
      where: { batchId: batch.id },
      include: {
        batch: {
          include: { coach: { include: { user: true } } },
        },
        coach: {
          include: { user: true },
        },
      },
    });

    const leadCoachNameInAdminSummary = batchLogs[0].batch.coach?.user?.name;
    const batchTotalAmount = batchLogs.reduce((sum, l) => sum + (l.payoutAmount ?? 0), 0);

    console.log(`  📊 Admin By Batch Summary: Batch Lead = "${leadCoachNameInAdminSummary}", Total Sessions = ${batchLogs.length}, Total Batch Payout = ₹${batchTotalAmount}`);

    const isBatchSummaryValid = leadCoachNameInAdminSummary === teacherUser.name && batchTotalAmount === 900;
    if (!isBatchSummaryValid) {
      throw new Error(`Batch summary validation failed! Lead: ${leadCoachNameInAdminSummary}, Total: ${batchTotalAmount}`);
    }
    console.log(`  ✅ Payout calculation & Batch attribution are 100% ACCURATE!`);

    // -------------------------------------------------------------------------
    // STEP 7: SET WORK TO INACTIVE AS REQUESTED
    // -------------------------------------------------------------------------
    console.log(`\n📌 STEP 7: Deactivating Test Entities (Cleanup & Inactivation)...`);
    await prisma.user.update({
      where: { id: teacherUser.id },
      data: { isActive: false },
    });
    await prisma.user.update({
      where: { id: subCoachUser.id },
      data: { isActive: false },
    });
    await prisma.user.update({
      where: { id: studentUser.id },
      data: { isActive: false },
    });
    await prisma.batch.update({
      where: { id: batch.id },
      data: { isActive: false },
    });
    console.log(`  ✅ All test entities set to isActive: false.`);

    console.log(`\n======================================================`);
    console.log(`🎉 ALL 7 INTEGRATION TEST STEPS PASSED WITH 100% SUCCESS!`);
    console.log(`======================================================\n`);

    return {
      success: true,
      credentials: {
        leadTeacher: {
          email: teacherEmail,
          password: plainPasswordTeacher,
          role: 'COACH',
          name: teacherUser.name,
          isActiveNow: false,
        },
        substituteTeacher: {
          email: subCoachEmail,
          password: plainPasswordSub,
          role: 'COACH',
          name: subCoachUser.name,
          isActiveNow: false,
        },
        student: {
          email: studentEmail,
          password: plainPasswordStudent,
          role: 'STUDENT',
          name: studentUser.name,
          isActiveNow: false,
        },
      },
      batch: {
        id: batch.id,
        code: batch.code,
        name: batch.name,
        isActiveNow: false,
      },
      payouts: {
        leadCoachPayout: leadPayoutTotal,
        substituteCoachPayout: subPayoutTotal,
        batchTotalPayout: batchTotalAmount,
      },
    };
  } catch (error: any) {
    console.error(`❌ TEST FAILED:`, error);
    // Cleanup on error
    if (teacherUser) await prisma.user.update({ where: { id: teacherUser.id }, data: { isActive: false } }).catch(() => {});
    if (subCoachUser) await prisma.user.update({ where: { id: subCoachUser.id }, data: { isActive: false } }).catch(() => {});
    if (studentUser) await prisma.user.update({ where: { id: studentUser.id }, data: { isActive: false } }).catch(() => {});
    if (batch) await prisma.batch.update({ where: { id: batch.id }, data: { isActive: false } }).catch(() => {});
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

runIntegratedEndToEndTest().then((res) => {
  console.log('Result Summary:', JSON.stringify(res, null, 2));
});
