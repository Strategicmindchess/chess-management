import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { calculatePenalty } from '../src/lib/penalty-engine';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

async function main() {
  const joinEventIds = [
    'cmu8jma24000004jnwdliylsg',
    'cmu9udcja000004k431z349co',
    'cmu9udiwf000004jtogrnfkgv',
    'cmu9ue2ds000104k47q8eigsu',
    'cmu9vdeuy000004jwi2szn4uu',
    'cmu9vtnlg000004l8uhambedy',
    'cmu9xzeuc00000417m0xdau07',
    'cmu9yj1oi000004l3odfgg820',
    'cmu9z5x7o000104l3yow9vtib',
    'cmu9z6b6w000204l3ak97lbgr',
    'cmua07e9q000004l0u5icc6b6',
    'cmub9vqe8000004l0wzxk7uik',
    'cmub9yavt000104l0bx35du2k',
    'cmubdzo9s000004jt302c2fys',
    'cmucrfx5x000004lcrq4a8vve',
    'cmucrgel2000104lcrkullgyg',
    'cmucrte05000004jk6khe27zb'
  ];

  console.log("Fetching requested ClassJoinEvents...");
  const joinEvents = await prisma.classJoinEvent.findMany({
    where: { id: { in: joinEventIds } },
    include: {
      classInstance: {
        include: { classLog: true }
      }
    }
  });

  const instanceIds = Array.from(new Set(joinEvents.map(e => e.classInstanceId)));
  
  const logs = await prisma.classLog.findMany({
    where: { classInstance: { id: { in: instanceIds } } },
    include: {
      classInstance: true,
      classFeedbacks: true,
      batch: {
        select: {
          _count: {
            select: { students: true }
          }
        }
      }
    }
  });

  if (logs.length === 0) {
    console.log("No logs found with 500 penalty.");
    return;
  }

  for (const log of logs) {
    console.log(`\n=== Debugging ClassLog ID: ${log.id} ===`);
    console.log(`Batch ID: ${log.batchId}`);
    
    const instance = log.classInstance;
    if (!instance) {
      console.log("No instance found.");
      continue;
    }

    console.log("Raw DB Values:");
    console.log(`- instance.date (UTC string): ${instance.date.toISOString()}`);
    console.log(`- instance.startTime: ${instance.startTime}`);
    console.log(`- log.coachJoinedAt (UTC string): ${log.coachJoinedAt?.toISOString()}`);
    console.log(`- log.attendanceMarkedAt (UTC string): ${log.attendanceMarkedAt?.toISOString()}`);
    console.log(`- log.penaltyNote: ${log.penaltyNote}`);

    const joinEvents = await prisma.classJoinEvent.findMany({
      where: { classInstanceId: instance.id, coachProfileId: log.coachProfileId },
      orderBy: { joinedAt: 'asc' }
    });
    console.log(`- joinEvents: ${joinEvents.map(e => e.joinedAt.toISOString()).join(', ')}`);

    // Worker's date calculation
    const TIME_ZONE = 'Asia/Kolkata';
    const classDateStr = formatInTimeZone(instance.date, TIME_ZONE, 'yyyy-MM-dd');
    const classScheduledStart = fromZonedTime(`${classDateStr} ${instance.startTime}`, TIME_ZONE);

    console.log("\nWorker's Time Calculation:");
    console.log(`- classDateStr (IST formatted): ${classDateStr}`);
    console.log(`- classScheduledStart (UTC): ${classScheduledStart.toISOString()}`);
    
    if (log.coachJoinedAt) {
      const lateMs = log.coachJoinedAt.getTime() - classScheduledStart.getTime();
      const lateMinutes = Math.floor(lateMs / 60_000);
      console.log(`- lateMs: ${lateMs}`);
      console.log(`- lateMinutes (Math.floor(lateMs / 60_000)): ${lateMinutes}`);
    }

    const completionTime = instance.completedAt ?? log.attendanceMarkedAt ?? log.createdAt;
    
    const engineInput = {
      coachJoinedAt: log.coachJoinedAt,
      classScheduledStart,
      attendanceMarkedAt: log.attendanceMarkedAt,
      classCompletedAt: completionTime,
      totalFeedbacksSubmitted: log.classFeedbacks.length,
      cameraOffReports: log.classFeedbacks.filter(f => f.cameraOffOver5Min).length,
      phoneUsageReports: log.classFeedbacks.filter(f => f.phoneUsedOver4Times).length,
      historicalPhonePenaltyCount: 0,
      totalStudents: log.batch._count.students,
    };

    console.log("\nEngine Input:");
    console.log(JSON.stringify(engineInput, null, 2));

    const result = calculatePenalty(engineInput);
    console.log("\nEngine Output (Dry Run):");
    console.log(JSON.stringify(result, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
