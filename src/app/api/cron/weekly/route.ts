import { NextResponse } from 'next/server';
import { leaderboardCalcQueue, attendanceSummaryQueue, assignmentSummaryQueue } from '@/workers/leaderboard.queues';
import { logger } from '@/lib/logger';
import { JOB_NAMES } from '@/lib/leaderboard-config';
import { startOfWeek, endOfWeek } from 'date-fns';
import { toDate } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kolkata';

export async function GET(req: Request) {
  try {
    const now = toDate(new Date(), { timeZone: TIMEZONE });
    const wStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const wEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

    await attendanceSummaryQueue.add(JOB_NAMES.CALC_ATTENDANCE, {
      periodType: 'WEEKLY',
      periodStart: wStart,
      periodEnd: wEnd,
    });
    
    await assignmentSummaryQueue.add(JOB_NAMES.CALC_ASSIGNMENT, {
      periodType: 'WEEKLY',
      periodStart: wStart,
      periodEnd: wEnd,
    });
    
    await leaderboardCalcQueue.add(JOB_NAMES.CALC_LEADERBOARD, {
      periodType: 'WEEKLY',
      periodStart: wStart,
      periodEnd: wEnd,
    });
    
    logger.info(`[Cron:Weekly] Queued weekly leaderboard calculation`);

    return NextResponse.json({ success: true, message: 'Weekly leaderboard calculation queued' });
  } catch (error: any) {
    logger.error('[Cron:Weekly] Failed to queue weekly calculation', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
