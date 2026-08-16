import { NextRequest, NextResponse } from 'next/server';
import { LEADERBOARD_CONFIG, JOB_NAMES } from '@/lib/leaderboard-config';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/leaderboard/refresh
 *
 * Webhook/cron endpoint to trigger full chess data refresh + leaderboard recalculation.
 * Protected by LEADERBOARD_REFRESH_SECRET environment variable.
 *
 * Body: { secret: string, periodType?: 'WEEKLY' | 'MONTHLY', action?: 'fetch' | 'calc' | 'all' }
 *
 * Usage with external cron (e.g., cron-job.org):
 *   POST https://yourdomain.com/api/leaderboard/refresh
 *   Content-Type: application/json
 *   Body: { "secret": "your-secret-from-env" }
 *
 * Usage with Vercel Cron (vercel.json):
 *   { "crons": [{ "path": "/api/leaderboard/refresh", "schedule": "0 2 * * *" }] }
 *   Add X-Vercel-Cron: 1 header check below if using Vercel Cron.
 */
export async function POST(req: NextRequest) {
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

  if (periodType === 'WEEKLY') {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() + mondayOffset);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  // Dynamically import queues (avoids bundling heavy deps at edge)
  const { chessFetchQueue, leaderboardCalcQueue } = await import('@/workers/leaderboard.queues');

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

  // ── Step 2: Queue leaderboard calculation ─────────────────────────────────
  if (action === 'calc' || action === 'all') {
    // Delay by 5 minutes so fetch jobs complete first
    const delayMs = action === 'all' ? 5 * 60 * 1000 : 0;

    await leaderboardCalcQueue.add(
      JOB_NAMES.CALC_LEADERBOARD,
      {
        periodType,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
      { delay: delayMs, priority: 1 }
    );
    results.push(`Leaderboard recalc queued (delay: ${delayMs / 1000}s)`);
  }

  return NextResponse.json({
    success: true,
    periodType,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    results,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/leaderboard/refresh/status
 * Returns the last calculation log entry.
 */
export async function GET(req: NextRequest) {
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
}
