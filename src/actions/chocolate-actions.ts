"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { format, startOfDay } from "date-fns";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

const CORRECT_POINTS = 5;
const WRONG_POINTS = -2;
const MAX_POINTS = 40;
const REWARD_THRESHOLD = 38;

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentMonth() {
  return format(new Date(), "yyyy-MM");
}

/** Upsert the monthly eligibility row and update totalPoints atomically */
async function recalcEligibility(studentProfileId: string, month: string) {
  // Sum all points for this student in this month
  const agg = await prisma.chocolateQuestionRecord.aggregate({
    where: { studentProfileId, month },
    _sum: { points: true },
  });

  const total = Math.min(Math.max(agg._sum.points ?? 0, 0), MAX_POINTS);
  const isEligible = total >= REWARD_THRESHOLD;

  const existing = await prisma.chocolateEligibility.findUnique({
    where: { studentProfileId_month: { studentProfileId, month } },
  });

  if (existing) {
    return prisma.chocolateEligibility.update({
      where: { id: existing.id },
      data: {
        totalPoints: total,
        isEligible,
        eligibleAt: isEligible && !existing.isEligible ? new Date() : existing.eligibleAt,
      },
    });
  } else {
    return prisma.chocolateEligibility.create({
      data: {
        studentProfileId,
        month,
        totalPoints: total,
        isEligible,
        eligibleAt: isEligible ? new Date() : null,
      },
    });
  }
}

// ── Coach: Award Marks ────────────────────────────────────────────────────────

/**
 * Called by a coach to award +5 (correct) or -2 (wrong) to a student.
 * Enforced: one mark per student per class day (backend unique constraint).
 */
export async function awardChocolateMarks(
  studentProfileId: string,
  isCorrect: boolean
) {
  const session = await requireRole([Role.TEACHER]);
  const coach = await prisma.coachProfile.findUnique({
    where: { userId: session.id },
  });
  if (!coach) return { error: "Coach profile not found" };

  const today = startOfDay(new Date());
  const month = currentMonth();
  const points = isCorrect ? CORRECT_POINTS : WRONG_POINTS;

  // Check if already marked today
  const existing = await prisma.chocolateQuestionRecord.findUnique({
    where: {
      studentProfileId_classDate: {
        studentProfileId,
        classDate: today,
      },
    },
  });
  if (existing) {
    return { error: "Marks already awarded to this student today." };
  }

  // Check student is in coach's batch
  const studentInBatch = await prisma.batchStudent.findFirst({
    where: {
      studentProfileId,
      batch: { coachProfileId: coach.id, isActive: true },
    },
  });
  if (!studentInBatch) {
    return { error: "Student is not in your active batch." };
  }

  // Create the record (unique constraint on studentProfileId + classDate)
  await prisma.chocolateQuestionRecord.create({
    data: {
      studentProfileId,
      coachId: coach.id,
      month,
      classDate: today,
      isCorrect,
      points,
    },
  });

  // Recalculate eligibility
  const eligibility = await recalcEligibility(studentProfileId, month);

  // Get student user for notification
  const studentUser = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: { user: true },
  });

  // Notify student of marks
  if (studentUser) {
    await createNotification({
      recipientId: studentUser.userId,
      type: "MANAGEMENT_POINTS_AWARDED",
      title: isCorrect ? "🍫 +5 Marks Earned!" : "🍫 -2 Marks",
      message: isCorrect
        ? `You answered correctly! +5 chocolate marks. Total this month: ${eligibility.totalPoints}/40`
        : `Wrong answer this time. -2 marks. Total this month: ${eligibility.totalPoints}/40`,
      eventKey: `CHOCOLATE_MARKS:${studentProfileId}:${today.toISOString()}`,
      href: "/student",
    });

    // Notify if newly eligible
    if (eligibility.isEligible && eligibility.totalPoints === REWARD_THRESHOLD) {
      await createNotification({
        recipientId: studentUser.userId,
        type: "CHOCOLATE_ELIGIBLE",
        title: "🎉 Chocolate Reward Unlocked!",
        message: `Congratulations! You've earned ${eligibility.totalPoints} marks this month. Claim your chocolate reward!`,
        eventKey: `CHOCOLATE_ELIGIBLE:${studentProfileId}:${month}`,
        href: "/student",
      });

      // Notify admins
      const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
      await Promise.all(
        admins.map((admin) =>
          createNotification({
            recipientId: admin.id,
            type: "CHOCOLATE_ELIGIBLE",
            title: "🍫 Student Eligible for Chocolate",
            message: `${studentUser.user.name} has reached ${eligibility.totalPoints} marks and is eligible for the chocolate reward.`,
            eventKey: `CHOCOLATE_ELIGIBLE_ADMIN:${studentProfileId}:${month}:${admin.id}`,
            href: "/admin/chocolate",
          })
        )
      );
    }
  }

  revalidatePath("/teacher");
  return { success: true, totalPoints: eligibility.totalPoints, isEligible: eligibility.isEligible };
}

// ── Coach: Get Students With Marks ────────────────────────────────────────────

export async function getCoachStudentsWithMarks() {
  const session = await requireRole([Role.TEACHER]);
  const coach = await prisma.coachProfile.findUnique({
    where: { userId: session.id },
  });
  if (!coach) return [];

  const month = currentMonth();
  const today = startOfDay(new Date());

  // Get all students in coach's active batches
  const batchStudents = await prisma.batchStudent.findMany({
    where: { batch: { coachProfileId: coach.id, isActive: true } },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
        },
      },
      batch: { select: { name: true, code: true } },
    },
    distinct: ["studentProfileId"],
  });

  const studentIds = batchStudents.map((bs) => bs.studentProfileId);

  // Get monthly eligibility
  const eligibilities = await prisma.chocolateEligibility.findMany({
    where: { studentProfileId: { in: studentIds }, month },
  });

  // Get today's marks
  const todayRecords = await prisma.chocolateQuestionRecord.findMany({
    where: { studentProfileId: { in: studentIds }, classDate: today },
  });

  return batchStudents.map((bs) => {
    const eligibility = eligibilities.find((e) => e.studentProfileId === bs.studentProfileId);
    const todayRecord = todayRecords.find((r) => r.studentProfileId === bs.studentProfileId);
    return {
      studentProfileId: bs.studentProfileId,
      studentName: bs.student.user.name,
      batchName: bs.batch.name,
      totalPoints: eligibility?.totalPoints ?? 0,
      maxPoints: MAX_POINTS,
      rewardThreshold: REWARD_THRESHOLD,
      isEligible: eligibility?.isEligible ?? false,
      markedToday: !!todayRecord,
      todayPoints: todayRecord?.points ?? null,
      todayCorrect: todayRecord?.isCorrect ?? null,
    };
  });
}

// ── Student: Get Chocolate Status ─────────────────────────────────────────────

export async function getStudentChocolateStatus() {
  const session = await requireRole([Role.STUDENT]);
  const student = await prisma.studentProfile.findUnique({
    where: { userId: session.id },
  });
  if (!student) return null;

  const month = currentMonth();

  const eligibility = await prisma.chocolateEligibility.findUnique({
    where: { studentProfileId_month: { studentProfileId: student.id, month } },
    include: { claimTicket: true },
  });

  // History (last 6 months)
  const history = await prisma.chocolateEligibility.findMany({
    where: { studentProfileId: student.id },
    orderBy: { month: "desc" },
    take: 6,
  });

  // Today's record
  const today = startOfDay(new Date());
  const todayRecord = await prisma.chocolateQuestionRecord.findUnique({
    where: {
      studentProfileId_classDate: {
        studentProfileId: student.id,
        classDate: today,
      },
    },
  });

  return {
    studentProfileId: student.id,
    month,
    totalPoints: eligibility?.totalPoints ?? 0,
    maxPoints: MAX_POINTS,
    rewardThreshold: REWARD_THRESHOLD,
    isEligible: eligibility?.isEligible ?? false,
    claimStatus: eligibility?.claimStatus ?? "NOT_CLAIMED",
    claimTicket: eligibility?.claimTicket ?? null,
    todayRecord: todayRecord
      ? { points: todayRecord.points, isCorrect: todayRecord.isCorrect }
      : null,
    history: history.map((h) => ({
      month: h.month,
      totalPoints: h.totalPoints,
      isEligible: h.isEligible,
      claimStatus: h.claimStatus,
    })),
  };
}

// ── Student: Claim Chocolate ──────────────────────────────────────────────────

export async function claimChocolateReward(data: {
  fullAddress: string;
  city: string;
  state: string;
  pincode: string;
  mobileNumber: string;
  additionalInfo?: string;
}) {
  const session = await requireRole([Role.STUDENT]);
  const student = await prisma.studentProfile.findUnique({
    where: { userId: session.id },
    include: { user: true },
  });
  if (!student) return { error: "Student profile not found" };

  const month = currentMonth();
  const eligibility = await prisma.chocolateEligibility.findUnique({
    where: { studentProfileId_month: { studentProfileId: student.id, month } },
    include: { claimTicket: true },
  });

  if (!eligibility?.isEligible) {
    return { error: "You are not yet eligible for the chocolate reward this month." };
  }
  if (eligibility.claimTicket) {
    return { error: "You have already submitted a claim this month." };
  }

  const [ticket] = await prisma.$transaction([
    prisma.chocolateClaimTicket.create({
      data: {
        eligibilityId: eligibility.id,
        studentId: student.id,
        ...data,
        status: "SUBMITTED",
      },
    }),
    prisma.chocolateEligibility.update({
      where: { id: eligibility.id },
      data: { claimStatus: "SUBMITTED" },
    }),
  ]);

  // Notify admins
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        recipientId: admin.id,
        type: "CHOCOLATE_ELIGIBLE",
        title: "🍫 Chocolate Claim Submitted",
        message: `${student.user.name} has submitted a chocolate reward claim for ${month}.`,
        eventKey: `CHOCOLATE_CLAIM:${eligibility.id}:${admin.id}`,
        href: "/admin/chocolate",
      })
    )
  );

  revalidatePath("/student");
  return { success: true, ticketNumber: ticket.ticketNumber };
}

// ── Admin: Get All Students Marks ─────────────────────────────────────────────

export async function getAdminChocolateData(month?: string) {
  await requireRole([Role.ADMIN]);
  const targetMonth = month ?? currentMonth();

  const eligibilities = await prisma.chocolateEligibility.findMany({
    where: { month: targetMonth },
    include: {
      student: { include: { user: { select: { name: true } } } },
      claimTicket: true,
    },
    orderBy: { totalPoints: "desc" },
  });

  return eligibilities.map((e) => ({
    studentProfileId: e.studentProfileId,
    studentName: e.student.user.name,
    month: e.month,
    totalPoints: e.totalPoints,
    maxPoints: e.maxPoints,
    rewardThreshold: e.rewardThreshold,
    isEligible: e.isEligible,
    claimStatus: e.claimStatus,
    claimTicket: e.claimTicket,
  }));
}

// ── Admin: Update Claim Status ────────────────────────────────────────────────

export async function updateChocolateClaimStatus(
  ticketId: string,
  status: "UNDER_REVIEW" | "APPROVED" | "DISPATCHED" | "DELIVERED",
  adminNote?: string
) {
  await requireRole([Role.ADMIN]);

  await prisma.$transaction([
    prisma.chocolateClaimTicket.update({
      where: { id: ticketId },
      data: { status, adminNote },
    }),
    prisma.chocolateEligibility.updateMany({
      where: { claimTicket: { id: ticketId } },
      data: { claimStatus: status },
    }),
  ]);

  revalidatePath("/admin");
  return { success: true };
}
