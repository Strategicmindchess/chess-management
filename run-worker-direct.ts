import 'dotenv/config';
import { prisma } from './src/lib/prisma';
import { attendanceSummaryQueue } from './src/workers/leaderboard.queues';
import { attendanceSummaryWorker } from './src/workers/attendance-summary.worker';
import { JOB_NAMES } from './src/lib/leaderboard-config';
import { startOfWeek, endOfWeek } from 'date-fns';
import { toDate } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kolkata';

async function main() {
  const now = toDate(new Date(), { timeZone: TIMEZONE });
  const wStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const wEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

  // Queue attendance job
  const job = await attendanceSummaryQueue.add(JOB_NAMES.CALC_ATTENDANCE, {
    periodType: 'WEEKLY',
    periodStart: wStart,
    periodEnd: wEnd,
  });

  console.log(`Queued job ${job.id}`);

  // wait 5 seconds for worker to process
  await new Promise(r => setTimeout(r, 5000));

  const records = await prisma.leaderboardAttendance.findMany();
  console.log("Records found:", records.length);
  if (records.length > 0) {
      console.log(records[0]);
  }
}

main().finally(() => {
    prisma.$disconnect();
    attendanceSummaryWorker.close();
});
