import { NextResponse } from 'next/server';
import { leaderboardCalcQueue, attendanceSummaryQueue, assignmentSummaryQueue } from '@/workers/leaderboard.queues';
import { logger } from '@/lib/logger';
import { JOB_NAMES } from '@/lib/leaderboard-config';
import { startOfMonth, endOfMonth } from 'date-fns';
import { toDate } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kolkata';

export async function GET(req: Request) {
  try {
    const now = toDate(new Date(), { timeZone: TIMEZONE });
    const mStart = startOfMonth(now).toISOString();
    const mEnd = endOfMonth(now).toISOString();

    await attendanceSummaryQueue.add(JOB_NAMES.CALC_ATTENDANCE, {
      periodType: 'MONTHLY',
      periodStart: mStart,
      periodEnd: mEnd,
    });
    
    await assignmentSummaryQueue.add(JOB_NAMES.CALC_ASSIGNMENT, {
      periodType: 'MONTHLY',
      periodStart: mStart,
      periodEnd: mEnd,
    });
    
    await leaderboardCalcQueue.add(JOB_NAMES.CALC_LEADERBOARD, {
      periodType: 'MONTHLY',
      periodStart: mStart,
      periodEnd: mEnd,
    });
    
    logger.info(`[Cron:Monthly] Queued monthly leaderboard calculation`);

    return NextResponse.json({ success: true, message: 'Monthly leaderboard calculation queued' });
  } catch (error: any) {
    logger.error('[Cron:Monthly] Failed to queue monthly calculation', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
