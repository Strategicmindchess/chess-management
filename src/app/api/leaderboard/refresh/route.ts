import { NextRequest, NextResponse } from 'next/server';
import { LEADERBOARD_CONFIG, JOB_NAMES } from '@/lib/leaderboard-config';
import { prisma } from '@/lib/prisma';
import { getCurrentPeriod } from '@/lib/leaderboard-period';
import { withLogging } from "../../../../lib/api-logger";

export let POST = withLogging(async function(req: NextRequest) {
    let body: Record<string, unknown> = {};
    try {
    body = await req.json();
    } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { secret, periodType = 'MONTHLY', action = 'all' } = body as {
    secret: string;
    periodType?: 'WEEKLY' | 'MONTHLY';
    action?: 'fetch' | 'calc' | 'all';
    };

    // Auth check
    if (secret !== LEADERBOARD_CONFIG.REFRESH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine period
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    const { periodStart: ps, periodEnd: pe } = getCurrentPeriod(periodType);
    periodStart = ps;
    periodEnd = pe;

    // Dynamically import queues (avoids bundling heavy deps at edge)
    const { chessFetchQueue, leaderboardCalcQueue, attendanceSummaryQueue, assignmentSummaryQueue } = await import('@/workers/leaderboard.queues');

    const results: string[] = [];

    // ── Step 1: Queue fetch jobs for all students ──────────────────────────────
    if (action === 'fetch' || action === 'all') {
    const profiles = await prisma.studentProfile.findMany({
      where: {
        OR: [
          { chessComId: { not: null } },
          { lichessId: { not: null } },
        ],
      },
      select: {
        id: true,
        chessComId: true,
        lichessId: true,
      },
    });

    if (profiles.length > 0) {
      await chessFetchQueue.addBulk(
        profiles.map((p) => ({
          name: JOB_NAMES.FETCH_ALL,
          data: {
            studentProfileId: p.id,
            chessComUsername: p.chessComId ?? null,
            lichessUsername: p.lichessId ?? null,
            periodType,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
          },
          opts: { delay: 0 },
        }))
      );
      results.push(`Queued fetch for ${profiles.length} students`);
    } else {
      results.push('No students with linked accounts');
    }
    }

    // ── Step 2: Queue summaries & leaderboard calculation ───────────────────────
    if (action === 'calc' || action === 'all') {
    // Delay calculation by 5 minutes so fetch jobs complete first (if action='all')
    const delayMs = action === 'all' ? 5 * 60 * 1000 : 0;

    await attendanceSummaryQueue.add(
      JOB_NAMES.CALC_ATTENDANCE,
      { periodType, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() }
    );

    await assignmentSummaryQueue.add(
      JOB_NAMES.CALC_ASSIGNMENT,
      { periodType, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() }
    );

    await leaderboardCalcQueue.add(
      JOB_NAMES.CALC_LEADERBOARD,
      {
        periodType,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
      { delay: delayMs, priority: 1 }
    );
    results.push(`Summaries & Leaderboard recalc queued (calc delay: ${delayMs / 1000}s)`);
    }

    return NextResponse.json({
    success: true,
    periodType,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    results,
    timestamp: new Date().toISOString(),
    });
    });
export let GET = withLogging(async function(req: NextRequest) {
    const secret = req.nextUrl.searchParams.get('secret');
    if (secret !== LEADERBOARD_CONFIG.REFRESH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [weeklyLog, monthlyLog] = await Promise.all([
    prisma.leaderboardCalculationLog.findFirst({
      where: { periodType: 'WEEKLY' },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.leaderboardCalculationLog.findFirst({
      where: { periodType: 'MONTHLY' },
      orderBy: { startedAt: 'desc' },
    }),
    ]);

    return NextResponse.json({
    weekly: weeklyLog,
    monthly: monthlyLog,
    config: {
      refreshIntervalMinutes: LEADERBOARD_CONFIG.REFRESH_INTERVAL_MINUTES,
      cacheTtlSeconds: LEADERBOARD_CONFIG.CACHE_TTL_SECONDS,
      mode: LEADERBOARD_CONFIG.LEADERBOARD_MODE,
    },
    });
    });
