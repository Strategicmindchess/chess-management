import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordClassJoinTime } from "@/actions/join-class-actions";
import { submitClassLog } from "@/actions/class-log-actions";
import { processPendingPenalties } from "@/workers/penalty.worker";
import { Role } from "@/lib/enums";
import { JOB_NAMES } from "@/lib/leaderboard-config";

vi.mock("@/lib/dal", () => ({
  requireRole: vi.fn().mockResolvedValue({
    id: "mock-user-id",
    role: "TEACHER",
  }),
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "mock-user-id",
    role: "TEACHER",
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Penalty Flow Integration", () => {
  let coachId: string;
  let batchId: string;
  let classInstanceId: string;

  beforeEach(async () => {
    // Targeted cleanup instead of wiping the whole DB
    const existingTestUser = await prisma.user.findUnique({ where: { email: "integration_test_coach@example.com" } });
    if (existingTestUser) {
      const existingCoach = await prisma.coachProfile.findUnique({ where: { userId: existingTestUser.id } });
      if (existingCoach) {
        await prisma.classJoinEvent.deleteMany({ where: { coachProfileId: existingCoach.id } });
        await prisma.classLog.deleteMany({ where: { coachProfileId: existingCoach.id } });
        await prisma.classInstance.deleteMany({ where: { batch: { coachProfileId: existingCoach.id } } });
        await prisma.batch.deleteMany({ where: { coachProfileId: existingCoach.id } });
        await prisma.coachProfile.delete({ where: { id: existingCoach.id } });
      }
      await prisma.user.delete({ where: { id: existingTestUser.id } });
    }

    const user = await prisma.user.create({
      data: {
        id: "mock-user-id",
        email: "integration_test_coach@example.com",
        role: "TEACHER",
        name: "Test Teacher",
      },
    });

    const coach = await prisma.coachProfile.create({
      data: {
        userId: user.id,
      },
    });

    coachId = coach.id;

    const batch = await prisma.batch.create({
      data: {
        name: "Integration Test Batch",
        code: "INT-TEST-01",
        meetLink: "https://meet.google.com/abc",
        coachProfileId: coachId,
        payoutRate: 500,
      },
    });

    batchId = batch.id;

    const classDate = new Date("2026-09-10T00:00:00.000Z");

    const instance = await prisma.classInstance.create({
      data: {
        batchId,
        date: classDate,
        startTime: "19:00",
        endTime: "20:00",
        status: "SCHEDULED",
      },
    });

    classInstanceId = instance.id;

    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  it("should calculate late-join penalty from JoinEvent, NOT attendance time", async () => {
    // ------------------------------------------------------------
    // CLASS SCHEDULE
    // ------------------------------------------------------------
    // 19:00 IST = 13:30 UTC
    const scheduledStart = new Date(
      "2026-09-10T13:30:00.000Z"
    );

    // Coach clicks Join at 19:05 IST = 13:35 UTC
    const joinTime = new Date(
      "2026-09-10T13:35:00.000Z"
    );

    // Coach marks attendance at 20:00 IST = 14:30 UTC
    const attendanceTime = new Date(
      "2026-09-10T14:30:00.000Z"
    );

    // ------------------------------------------------------------
    // 1. COACH CLICKS JOIN
    // ------------------------------------------------------------

    vi.setSystemTime(joinTime);

    const joinResult = await recordClassJoinTime(
      classInstanceId
    );

    expect(joinResult.success).toBe(true);

    // Verify JoinEvent
    const joinEvents = await prisma.classJoinEvent.findMany({
      where: {
        classInstanceId,
        coachProfileId: coachId,
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    expect(joinEvents).toHaveLength(1);

    expect(
      joinEvents[0].joinedAt.toISOString()
    ).toBe(joinTime.toISOString());

    expect(joinEvents[0].source).toBe(
      "JOIN_BUTTON"
    );

    // Verify first Join stored on ClassInstance
    const instanceAfterJoin =
      await prisma.classInstance.findUnique({
        where: {
          id: classInstanceId,
        },
      });

    expect(
      instanceAfterJoin?.startedAt?.toISOString()
    ).toBe(joinTime.toISOString());

    // ------------------------------------------------------------
    // 2. COACH MARKS ATTENDANCE
    // ------------------------------------------------------------

    vi.setSystemTime(attendanceTime);

    const attendanceResult =
      await submitClassLog({
        classInstanceId: classInstanceId,
        topicCovered: "Integration Testing",
        durationMins: 55,
        attendance: [],
      });

    expect(attendanceResult.success).toBe(true);

    // ------------------------------------------------------------
    // 3. VERIFY CLASS LOG
    // ------------------------------------------------------------

    const completedInstance =
      await prisma.classInstance.findUnique({
        where: {
          id: classInstanceId,
        },
        include: {
          classLog: true,
        },
      });

    expect(completedInstance).not.toBeNull();
    expect(completedInstance?.classLog).not.toBeNull();

    const classLog = completedInstance!.classLog!;

    // CRITICAL ASSERTION:
    // Join time must come from ClassJoinEvent.
    expect(
      classLog.coachJoinedAt?.toISOString()
    ).toBe(joinTime.toISOString());

    // Attendance time must be separate.
    expect(
      classLog.attendanceMarkedAt?.toISOString()
    ).toBe(attendanceTime.toISOString());

    // They MUST NOT be equal.
    expect(
      classLog.coachJoinedAt?.getTime()
    ).not.toBe(
      classLog.attendanceMarkedAt?.getTime()
    );

    // ------------------------------------------------------------
    // 4. MAKE CLASS OLD ENOUGH FOR WORKER
    // ------------------------------------------------------------

    // Worker only processes >=48h old classes.
    // Move current time to 97 hours after completion.
    const workerTime = new Date(
      "2026-09-14T15:30:00.000Z"
    );

    vi.setSystemTime(workerTime);

    // ------------------------------------------------------------
    // 5. RUN PENALTY WORKER
    // ------------------------------------------------------------

    const fakeJob = {
      name: JOB_NAMES.PROCESS_PENALTIES,
      id: "test-penalty-job",
    } as any;

    await processPendingPenalties(fakeJob);

    // ------------------------------------------------------------
    // 6. VERIFY FINAL RESULT
    // ------------------------------------------------------------

    const finalLog =
      await prisma.classLog.findUnique({
        where: {
          id: classLog.id,
        },
      });

    expect(finalLog).not.toBeNull();

    // Worker must finalize it.
    expect(
      finalLog?.penaltyCalculatedAt
    ).not.toBeNull();

    // The late calculation must be:
    // 19:05 - 19:00 = 5 minutes
    // It MUST NOT calculate:
    // 20:00 - 19:00 = 60 minutes
    expect(
      finalLog?.penaltyNote
    ).toContain("5 min late");

    expect(
      finalLog?.penaltyNote
    ).not.toContain("60 min");

    console.log(
      "FINAL PENALTY:",
      finalLog?.penaltyAmount
    );

    console.log(
      "PENALTY NOTE:",
      finalLog?.penaltyNote
    );
  });

  it("should not penalize early join (18:55)", async () => {
    // Scheduled: 19:00 IST = 13:30 UTC
    // Coach clicks Join at 18:55 IST = 13:25 UTC
    const joinTime = new Date("2026-09-10T13:25:00.000Z");
    
    // Coach marks attendance at 20:00 IST = 14:30 UTC (no attendance delay)
    const attendanceTime = new Date("2026-09-10T14:30:00.000Z");

    // 1. JOIN
    vi.setSystemTime(joinTime);
    await recordClassJoinTime(classInstanceId);

    // 2. ATTENDANCE
    vi.setSystemTime(attendanceTime);
    await submitClassLog({
      classInstanceId: classInstanceId,
      topicCovered: "Early Join Testing",
      durationMins: 60,
      attendance: [],
    });

    const completedInstance = await prisma.classInstance.findUnique({
      where: { id: classInstanceId },
      include: { classLog: true },
    });
    const classLog = completedInstance!.classLog!;

    // 3. WORKER (97 hours later)
    const workerTime = new Date("2026-09-14T15:30:00.000Z");
    vi.setSystemTime(workerTime);

    const fakeJob = { name: JOB_NAMES.PROCESS_PENALTIES, id: "test-penalty-job" } as any;
    await processPendingPenalties(fakeJob);

    // 4. ASSERT
    const finalLog = await prisma.classLog.findUnique({
      where: { id: classLog.id },
    });

    expect(finalLog?.penaltyCalculatedAt).not.toBeNull();
    
    // Early join means 0 late minutes, so no penalty.
    // Since attendance is on time and no feedback, total should be 0.
    expect(finalLog?.penaltyAmount).toBe(0);
    expect(finalLog?.penaltyNote).toBeNull(); // Empty notes are stored as null or empty string, let's just check it doesn't contain late
    if (finalLog?.penaltyNote) {
      expect(finalLog.penaltyNote).not.toContain("late");
    }
  });
});
