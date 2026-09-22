"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";

export async function getCoachesList() {
  await requireRole([Role.ADMIN]);

  const coaches = await prisma.coachProfile.findMany({
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: {
      user: { name: "asc" },
    },
  });

  return coaches.map((c) => ({
    id: c.id,
    name: c.user.name,
    email: c.user.email,
  }));
}

export async function getCoachClassesForFeedback(coachProfileId: string, page: number = 1, pageSize: number = 20) {
  await requireRole([Role.ADMIN]);

  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.classLog.findMany({
      where: {
        coachProfileId,
        classInstance: { status: "COMPLETED" },
      },
      include: {
        classInstance: {
          include: {
            joinEvents: {
              orderBy: { joinedAt: "asc" },
              take: 1,
            },
          },
        },
        batch: {
          include: {
            students: true,
          },
        },
        classFeedbacks: true,
      },
      orderBy: {
        date: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.classLog.count({
      where: {
        coachProfileId,
        classInstance: { status: "COMPLETED" },
      },
    }),
  ]);

  const mappedLogs = logs.map((log) => {
    const totalEnrolled = log.batch.students.length;
    const feedbackSubmitted = log.classFeedbacks.length;
    const feedbackPercentage =
      totalEnrolled > 0 ? (feedbackSubmitted / totalEnrolled) * 100 : 0;

    const cameraReports = log.classFeedbacks.filter((f) => f.cameraOffOver5Min).length;
    const phoneReports = log.classFeedbacks.filter((f) => f.phoneUsedOver4Times).length;

    let penaltyStatus = "PENDING";
    if (log.penaltyWaived) penaltyStatus = "WAIVED";
    else if (log.adminPenaltyOverride) penaltyStatus = "OVERRIDDEN";
    else if (log.penaltyCalculatedAt) penaltyStatus = "CALCULATED";

    // Actual first join from joinEvents, fallback to coachJoinedAt
    const actualFirstJoin =
      log.classInstance?.joinEvents && log.classInstance.joinEvents.length > 0
        ? log.classInstance.joinEvents[0].joinedAt
        : log.coachJoinedAt;

    const completionTime = log.classInstance?.completedAt ?? log.attendanceMarkedAt ?? log.createdAt;
    const calculatesOn = new Date(completionTime.getTime() + 48 * 60 * 60 * 1000);

    return {
      id: log.id,
      batchName: log.batch.name,
      date: log.date,
      scheduledStart: log.classInstance?.startTime,
      scheduledEnd: log.classInstance?.endTime,
      actualFirstJoin,
      totalEnrolled,
      feedbackSubmitted,
      feedbackPercentage,
      cameraReports,
      phoneReports,
      penaltyAmount: log.penaltyAmount,
      penaltyStatus,
      penaltyCalculatedAt: log.penaltyCalculatedAt,
      penaltyNote: log.penaltyNote,
      hasPhonePenalty: log.hasPhonePenalty,
      calculatesOn,
    };
  });

  return {
    data: mappedLogs,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  };
}
