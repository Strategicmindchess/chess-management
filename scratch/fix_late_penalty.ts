import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { calculatePenalty, type PenaltyEngineInput } from '../src/lib/penalty-engine';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

async function fixLatePenalties() {
  const TIME_ZONE = 'Asia/Kolkata';

  // Find all logs with a Late Join penalty or Missed class penalty
  const logs = await prisma.classLog.findMany({
    where: {
      OR: [
        { penaltyNote: { contains: 'Late join' } },
        { penaltyNote: { contains: 'Missed class' } },
      ],
    },
    include: {
      classInstance: true,
      classFeedbacks: {
        select: {
          cameraOffOver5Min: true,
          phoneUsedOver4Times: true,
        },
      },
      batch: {
        select: {
          _count: {
            select: { students: true },
          },
        },
      },
    }
  });

  console.log(`Found ${logs.length} logs with a late join penalty.`);

  for (const log of logs) {
    if (!log.classInstance) continue;

    const instance = log.classInstance;
    const istDate = toZonedTime(instance.date, TIME_ZONE);
    const classDateStr = format(istDate, 'yyyy-MM-dd');
    const classScheduledStart = fromZonedTime(`${classDateStr} ${instance.startTime}`, TIME_ZONE);

    // Count historical phone penalties for this coach (past classes only)
    const historicalPhonePenaltyCount = await prisma.classLog.count({
      where: {
        coachProfileId: log.coachProfileId,
        hasPhonePenalty: true,
        id: { not: log.id },
      },
    });

    const cameraOffReports = log.classFeedbacks.filter((f: any) => f.cameraOffOver5Min).length;
    const phoneUsageReports = log.classFeedbacks.filter((f: any) => f.phoneUsedOver4Times).length;

    // Set coachJoinedAt to scheduled start time to WAIVE the late join penalty
    // because we lost the historical data for actual join time
    const engineInput: PenaltyEngineInput = {
      coachJoinedAt: classScheduledStart, 
      classScheduledStart,
      attendanceMarkedAt: log.attendanceMarkedAt ?? log.createdAt,
      classCompletedAt: instance.completedAt ?? log.attendanceMarkedAt ?? log.createdAt,
      totalFeedbacksSubmitted: log.classFeedbacks.length,
      cameraOffReports,
      phoneUsageReports,
      historicalPhonePenaltyCount,
      totalStudents: log.batch._count.students,
    };

    const { totalPenalty, breakdown, hasPhonePenalty } = calculatePenalty(engineInput);

    await prisma.classLog.update({
      where: { id: log.id },
      data: {
        penaltyAmount: totalPenalty,
        penaltyNote: breakdown.length > 0 ? breakdown.join('; ') : null,
        hasPhonePenalty,
      },
    });

    console.log(`Fixed log ${log.id}: penaltyAmount is now ${totalPenalty}, note: ${breakdown.length > 0 ? breakdown.join('; ') : 'NULL'}`);
  }
}

fixLatePenalties()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
