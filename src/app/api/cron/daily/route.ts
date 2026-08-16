import { NextResponse } from 'next/server';
import { chessFetchQueue, logCleanupQueue } from '@/workers/leaderboard.queues';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { JOB_NAMES } from '@/lib/leaderboard-config';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { toDate } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kolkata';

export async function GET(req: Request) {
  try {
    // 1. Queue fetch jobs for ALL students for WEEKLY and MONTHLY periods
    const activeStudents = await prisma.user.findMany({
      where: { role: 'STUDENT', isActive: true },
      select: { studentProfile: { select: { id: true, chessComId: true, lichessId: true } } },
    });

    const now = toDate(new Date(), { timeZone: TIMEZONE });
    
    const wStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const wEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const mStart = startOfMonth(now).toISOString();
    const mEnd = endOfMonth(now).toISOString();

    const fetchJobs = [];
    for (const u of activeStudents) {
      if (!u.studentProfile) continue;
      const p = u.studentProfile;
      if (!p.chessComId && !p.lichessId) continue;
      
      // Push weekly fetch
      fetchJobs.push({
        name: JOB_NAMES.FETCH_STUDENT,
        data: {
          studentProfileId: p.id,
          chessComUsername: p.chessComId,
          lichessUsername: p.lichessId,
          periodType: 'WEEKLY' as const,
          periodStart: wStart,
          periodEnd: wEnd,
        },
      });
      // Push monthly fetch
      fetchJobs.push({
        name: JOB_NAMES.FETCH_STUDENT,
        data: {
          studentProfileId: p.id,
          chessComUsername: p.chessComId,
          lichessUsername: p.lichessId,
          periodType: 'MONTHLY' as const,
          periodStart: mStart,
          periodEnd: mEnd,
        },
      });
    }

    await chessFetchQueue.addBulk(fetchJobs);
    logger.info(`[Cron:Daily] Queued ${fetchJobs.length} chess-fetch jobs`);

    // 2. Queue log cleanup
    await logCleanupQueue.add(JOB_NAMES.PURGE_OLD_LOGS, {});
    logger.info(`[Cron:Daily] Queued log cleanup job`);

    return NextResponse.json({ success: true, queuedFetches: fetchJobs.length });
  } catch (error: any) {
    logger.error('[Cron:Daily] Failed to queue daily jobs', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
