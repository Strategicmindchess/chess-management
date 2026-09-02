import { leaderboardCalcQueue } from '../src/workers/leaderboard.queues';
import { JOB_NAMES } from '../src/lib/leaderboard-config';
import { fromZonedTime } from 'date-fns-tz';

async function main() {
  // Using explicit strings like we did in payout-actions for consistency
  const startDateStr = "2026-08-01 00:00:00";
  const endDateStr = "2026-08-31 23:59:59.999";
  
  const periodStart = fromZonedTime(startDateStr, "Asia/Kolkata");
  const periodEnd = fromZonedTime(endDateStr, "Asia/Kolkata");

  console.log(`Queueing calc for ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

  await leaderboardCalcQueue.add(
    JOB_NAMES.CALC_LEADERBOARD,
    {
      periodType: 'MONTHLY',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }
  );

  console.log("Recalculation job queued successfully in BullMQ!");
}

main().catch(console.error).finally(() => process.exit(0));
