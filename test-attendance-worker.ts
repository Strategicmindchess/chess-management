import 'dotenv/config';
import { prisma } from './src/lib/prisma';
import { attendanceSummaryQueue } from './src/workers/leaderboard.queues';
import { JOB_NAMES } from './src/lib/leaderboard-config';
import { startOfWeek, endOfWeek } from 'date-fns';
import { toDate } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kolkata';

async function main() {
  const now = toDate(new Date(), { timeZone: TIMEZONE });
  const wStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const wEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

  // Create a dummy batch if not exists
  let batch = await prisma.batch.findFirst();
  if (!batch) {
    batch = await prisma.batch.create({
      data: {
        name: 'Test Batch',
        code: 'TEST-001',
        meetLink: 'http://meet.google.com/test',
        payoutRate: 500,
      }
    });
  }

  // Get a student and coach
  const student = await prisma.studentProfile.findFirst();
  let coach = await prisma.coachProfile.findFirst();

  if (!student) {
    console.log("No student found");
    return;
  }
  if (!coach) {
    console.log("No coach found");
    const user = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    if (user) {
        coach = await prisma.coachProfile.create({ data: { userId: user.id }});
    } else {
        console.log("no teacher user either");
        return;
    }
  }

  // Create class log and attendance record
  const classLog = await prisma.classLog.create({
    data: {
      batchId: batch.id,
      coachProfileId: coach.id,
      date: new Date(),
      topicCovered: 'Testing Attendance',
      durationMins: 60,
    }
  });

  await prisma.attendanceRecord.create({
    data: {
      classLogId: classLog.id,
      studentProfileId: student.id,
      status: 'PRESENT',
    }
  });

  console.log(`Created ClassLog ${classLog.id} and AttendanceRecord for student ${student.id}`);

  // Queue attendance job
  const job = await attendanceSummaryQueue.add(JOB_NAMES.CALC_ATTENDANCE, {
    periodType: 'WEEKLY',
    periodStart: wStart,
    periodEnd: wEnd,
  });

  console.log(`Queued job ${job.id}`);
}

main().catch(console.error);
