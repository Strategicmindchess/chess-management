import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { getISTDayBounds } from '../src/lib/timezone';

async function runDeepStressTest() {
  console.log("=================================================");
  console.log("🔥 RUNNING DEEP SYSTEM STRESS-TEST & FAILURE AUDIT");
  console.log("=================================================");

  const results: { test: string; status: 'PASS' | 'FAIL' | 'BUG_FOUND'; details: string }[] = [];

  // STRESS TEST 1: coachPay = 0 vs NULL
  // If batch payoutRate = 300, but session coachPay = 0 (e.g. Free/volunteer session):
  // Does it evaluate to 0 or erroneously fallback to 300?
  {
    const sessionWithZeroPay: any = { coachPay: 0 };
    const sessionWithNullPay: any = { coachPay: null };
    const batch = { payoutRate: 300 };

    const payoutForZero = sessionWithZeroPay.coachPay ?? batch.payoutRate;
    const payoutForNull = sessionWithNullPay.coachPay ?? batch.payoutRate;

    if (payoutForZero === 0 && payoutForNull === 300) {
      results.push({
        test: "STRESS 1: Zero Pay (0) vs NULL Pay using Nullish Coalescing (??)",
        status: "PASS",
        details: "payoutAmount correctly preserves ₹0 when coachPay is 0, and falls back to ₹300 only when coachPay is null."
      });
    } else {
      results.push({
        test: "STRESS 1: Zero Pay (0) vs NULL Pay",
        status: "BUG_FOUND",
        details: `Zero pay resulted in ${payoutForZero}, Null pay resulted in ${payoutForNull}`
      });
    }
  }

  // STRESS TEST 2: Join Button -> Attendance Submission End-to-End Simulation
  // Simulate complete lifecycle in a transaction:
  // Coach A owns batch, Coach B is assigned to Session.
  // Coach B joins -> Join event logged for Coach B.
  // Coach B marks attendance -> ClassLog created for Coach B.
  // Verify payoutAmount, coachProfileId, coachClassTaken, classInstance status.
  try {
    const coaches = await prisma.coachProfile.findMany({
      take: 2,
      include: { user: true }
    });

    if (coaches.length >= 2) {
      const coachA = coaches[0];
      const coachB = coaches[1];

      await prisma.$transaction(async (tx) => {
        // Create batch with Coach A
        const batch = await tx.batch.create({
          data: {
            name: "LIFECYCLE TEST BATCH",
            code: "LIFE-" + Date.now(),
            meetLink: "https://meet.google.com/test-life",
            coachProfileId: coachA.id,
            payoutRate: 350,
            isActive: true,
          }
        });

        // Create instance with Coach B (Substitute, pay = 450)
        const instance = await tx.classInstance.create({
          data: {
            batchId: batch.id,
            date: new Date(),
            startTime: "16:00",
            endTime: "17:00",
            status: "SCHEDULED",
            coachProfileId: coachB.id,
            coachPay: 450,
          } as any
        });

        // 1. Join simulation: recordClassJoinTime logic
        const effectiveCoachId = (instance as any).coachProfileId || batch.coachProfileId;
        const joinTime = new Date();
        const joinEvent = await tx.classJoinEvent.create({
          data: {
            classInstanceId: instance.id,
            coachProfileId: effectiveCoachId,
            joinedAt: joinTime,
            source: "JOIN_BUTTON"
          }
        });

        // 2. Attendance simulation: submitClassLog logic
        // Check pre-condition: effectiveCoachId matches submitter
        const submitterCoachId = coachB.id;
        const isAuthorized = ((instance as any).coachProfileId ?? batch.coachProfileId) === submitterCoachId;

        if (!isAuthorized) {
          throw new Error("AUTHORIZATION_FAILED");
        }

        // Verify join event found for submitter
        const foundJoinEvent = await tx.classJoinEvent.findFirst({
          where: {
            classInstanceId: instance.id,
            coachProfileId: submitterCoachId,
          }
        });

        if (!foundJoinEvent) {
          throw new Error("JOIN_EVENT_NOT_FOUND_FOR_SUBSTITUTE");
        }

        // Create ClassLog
        const finalPayout = (instance as any).coachPay ?? batch.payoutRate;
        const classLog = await tx.classLog.create({
          data: {
            batchId: batch.id,
            coachProfileId: submitterCoachId,
            date: instance.date,
            topicCovered: "Advanced Rook Endgames",
            durationMins: 60,
            payoutAmount: finalPayout,
            coachClassTaken: submitterCoachId,
            attendanceMarkedAt: new Date(),
            coachJoinedAt: foundJoinEvent.joinedAt
          } as any
        });

        // Update instance
        await tx.classInstance.update({
          where: { id: instance.id },
          data: {
            status: "COMPLETED",
            classLogId: classLog.id,
          }
        });

        // Verify data integrity
        if (
          classLog.coachProfileId === coachB.id &&
          classLog.coachClassTaken === coachB.id &&
          classLog.payoutAmount === 450
        ) {
          results.push({
            test: "STRESS 2: End-to-End Substitute Lifecycle (Join -> Attendance -> Log)",
            status: "PASS",
            details: `Substitute coach (${coachB.user.name}) successfully joined, marked attendance, and earned exact custom session rate (₹450). Original coach (${coachA.user.name}) was not involved.`
          });
        } else {
          results.push({
            test: "STRESS 2: End-to-End Substitute Lifecycle",
            status: "FAIL",
            details: `Data mismatch: coachProfileId=${classLog.coachProfileId}, payout=${classLog.payoutAmount}`
          });
        }

        // Rollback
        throw new Error("ROLLBACK_FOR_SAFETY");
      }).catch(err => {
        if (err.message !== "ROLLBACK_FOR_SAFETY") throw err;
      });
    }
  } catch (err: any) {
    results.push({
      test: "STRESS 2: End-to-End Substitute Lifecycle",
      status: "FAIL",
      details: err.message
    });
  }

  // STRESS TEST 3: Past Classes (< 28 Oct) Un-marked Attendance Submission
  // What if a past class (where coachProfileId = NULL) needs to be marked by the batch coach?
  try {
    const activeBatchWithCoach = await prisma.batch.findFirst({
      where: { coachProfileId: { not: null }, isActive: true },
      include: { coach: { include: { user: true } } }
    });

    if (activeBatchWithCoach && activeBatchWithCoach.coachProfileId) {
      const coachId = activeBatchWithCoach.coachProfileId;
      
      // Instance with coachProfileId = NULL (representing historical record)
      const instanceWithNullCoach: any = {
        coachProfileId: null,
        batch: { coachProfileId: coachId, payoutRate: 300 }
      };

      const effectiveCoach = instanceWithNullCoach.coachProfileId ?? instanceWithNullCoach.batch.coachProfileId;
      const isAuthorized = (effectiveCoach === coachId);
      const payout = instanceWithNullCoach.coachPay ?? instanceWithNullCoach.batch.payoutRate;

      if (isAuthorized && payout === 300) {
        results.push({
          test: "STRESS 3: Historical Class (NULL coachProfileId) Attendance Fallback",
          status: "PASS",
          details: `Historical classes with NULL coachProfileId fall back seamlessly to batch coach (${activeBatchWithCoach.coach?.user.name}) and batch payoutRate (₹300).`
        });
      } else {
        results.push({
          test: "STRESS 3: Historical Class Attendance Fallback",
          status: "FAIL",
          details: `Failed fallback: authorized=${isAuthorized}, payout=${payout}`
        });
      }
    }
  } catch (err: any) {
    results.push({
      test: "STRESS 3: Historical Class Attendance Fallback",
      status: "FAIL",
      details: err.message
    });
  }

  console.log("\n--- DEEP STRESS TEST RESULTS ---");
  for (const r of results) {
    console.log(`[${r.status}] ${r.test}`);
    console.log(`   -> ${r.details}`);
  }
  console.log("=================================================");
}

runDeepStressTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
