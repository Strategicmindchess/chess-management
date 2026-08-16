import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const period = getCurrentPeriod('MONTHLY');
  console.log(`Syncing attendance for period starting: ${period.periodStart.toISOString()}`);

  const activeStudents = await prisma.user.findMany({
    where: { role: 'STUDENT', isActive: true },
    select: { studentProfile: { select: { id: true } } },
  });

  const studentIds = activeStudents
    .map((u) => u.studentProfile?.id)
    .filter((id): id is string => Boolean(id));

  console.log(`Found ${studentIds.length} active students.`);

  const recordsInPeriod = await prisma.attendanceRecord.findMany({
    where: {
      studentProfileId: { in: studentIds },
      classLog: {
        date: {
          gte: period.periodStart,
          lte: period.periodEnd,
        },
      },
    },
    select: {
      studentProfileId: true,
      status: true,
    },
  });

  const attendanceMap = new Map<string, { total: number; present: number }>();
  for (const sid of studentIds) {
    attendanceMap.set(sid, { total: 0, present: 0 });
  }

  for (const record of recordsInPeriod) {
    const stats = attendanceMap.get(record.studentProfileId);
    if (stats) {
      stats.total += 1;
      if (record.status === 'PRESENT') {
        stats.present += 1;
      }
    }
  }

  let processedCount = 0;
  for (const [studentId, stats] of attendanceMap.entries()) {
    const percentage = stats.total === 0 ? 0 : (stats.present / stats.total) * 100;

    await prisma.leaderboardAttendance.upsert({
      where: {
        studentProfileId_periodType_periodStart: {
          studentProfileId: studentId,
          periodType: 'MONTHLY',
          periodStart: period.periodStart,
        },
      },
      create: {
        studentProfileId: studentId,
        periodType: 'MONTHLY',
        periodStart: period.periodStart,
        totalClasses: stats.total,
        classesAttended: stats.present,
        attendancePercent: percentage,
      },
      update: {
        totalClasses: stats.total,
        classesAttended: stats.present,
        attendancePercent: percentage,
      },
    });

    processedCount++;
  }

  console.log(`Attendance calculation complete for ${processedCount} students.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
