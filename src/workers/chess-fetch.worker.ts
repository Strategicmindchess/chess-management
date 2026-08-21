import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { fetchChessComArchives, fetchChessComMonthGames, fetchChessComStats } from '../services/chess/chesscom';
import { fetchLichessActivity, fetchLichessGamesInRange, fetchLichessUser, type LichessRawUser } from '../services/chess/lichess';
import { normalizeChessCom, normalizeLichess } from '../services/chess/normalizer';
import { aggregate, calcStreak } from '../services/chess/aggregator';
import { connection } from './queue';
import { QUEUE_NAMES } from '../lib/leaderboard-config';
import { leaderboardCalcQueue } from './leaderboard.queues';
import { logger } from '../lib/logger';

// Internal types
type ProviderState = 'FULL' | 'PARTIAL' | 'FAILED' | 'SKIPPED';

export async function processChessFetch(job: Job) {
  const { studentProfileId, periodType, periodStart: pStart, periodEnd: pEnd } = job.data;
  const startedAt = new Date();
  let ccState: ProviderState = 'SKIPPED';
  let liState: ProviderState = 'SKIPPED';
  let runError: string | null = null;
  
  if (!studentProfileId) throw new Error('Missing studentProfileId');
  if (periodType !== 'MONTHLY' && periodType !== 'WEEKLY') throw new Error('Invalid periodType');
  if (!pStart) throw new Error('Missing periodStart');

  const periodStart = new Date(pStart);
  let periodEnd: Date;
  
  if (pEnd) {
    periodEnd = new Date(pEnd);
  } else {
    // Default periods
    if (periodType === 'MONTHLY') {
      periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      periodEnd = new Date(periodStart.getTime());
      periodEnd.setDate(periodStart.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);
    }
  }

  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];

  try {
  await job.log(`[ChessFetchWorker] Starting fetch for ${studentProfileId}`);
  await job.log(`[ChessFetchWorker] Period: ${periodType} (${periodStartStr} to ${periodEndStr})`);
  await job.updateProgress(5);

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: {
      chessAccount: {
        select: {
          chessComUsername: true,
          lichessUsername: true,
        }
      }
    }
  });

  if (!student) {
    throw new Error(`Student ${studentProfileId} not found`);
  }

  // Handle migration state (Account linked either in StudentProfile or ChessAccount)
  // For backwards compatibility, some code used to check studentProfile fields, but now they are only in ChessAccount.
  // Wait, the schema has chessComId / lichessId. We only fetch usernames from chessAccount.
  const chessComUsername = student.chessAccount?.chessComUsername || null;
  const lichessUsername = student.chessAccount?.lichessUsername || null;

  if (!chessComUsername && !lichessUsername) {
    await job.log(`[ChessFetchWorker] No chess accounts linked for ${studentProfileId}. Skipping.`);
    await job.updateProgress(100);
    return { skipped: true, reason: 'No accounts linked' };
  }

  // We fetch up to 30 days prior for streak calculation
  const activitySince = new Date(periodEnd);
  activitySince.setDate(activitySince.getDate() - 30);

  // --- SAFE FETCH STRATEGY ---
  // We fetch Chess.com and Lichess independently.
  // We strictly track the success state of each provider.
  // If a provider fetch FAILS (e.g., API is down, rate limited), we DO NOT overwrite the DB with 0.
  // If a provider fetch SUCCEEDS but returns 0 games, that is a GENUINE ZERO, and we DO overwrite the DB with 0.

  // ── 1. Fetch Chess.com ──────────────────────────────────────────────────
  
  let chessComActivity = null;
  const chessComRawGames: any[] = [];
  ccState = chessComUsername ? 'FULL' : 'SKIPPED';

  if (chessComUsername) {
    await job.log(`[CC] Fetching stats for ${chessComUsername}...`);
    const statsResult = await fetchChessComStats(chessComUsername);
    
    if (!statsResult.ok) {
      ccState = 'FAILED';
      await job.log(`[CC] FAILED stats fetch for ${chessComUsername} — status=${statsResult.status ?? 'network'} error="${statsResult.error}"`);
      await prisma.chessApiFetchLog.create({
        data: {
          studentProfileId,
          provider: 'CHESS_COM',
          periodStart,
          periodEnd,
          success: false,
          statusCode: statsResult.status ?? 0,
          gameCount: 0,
          rawResponse: { endpoint: 'stats', error: statsResult.error } as object,
        },
      });
    } else {
      const chessComStats = statsResult.data;
      await job.log(`[CC] Stats OK`);

      await job.log(`[CC] Fetching archives for ${chessComUsername}...`);
      const archivesResult = await fetchChessComArchives(chessComUsername);

      if (!archivesResult.ok) {
        ccState = 'FAILED';
        await job.log(`[CC] FAILED archives fetch for ${chessComUsername} — status=${archivesResult.status ?? 'network'} error="${archivesResult.error}"`);
        await prisma.chessApiFetchLog.create({
          data: {
            studentProfileId,
            provider: 'CHESS_COM',
            periodStart,
            periodEnd,
            success: false,
            statusCode: archivesResult.status ?? 0,
            gameCount: 0,
            rawResponse: { endpoint: 'archives', error: archivesResult.error } as object,
          },
        });
      } else {
        const archives = archivesResult.data;
        await job.log(`[CC] Archives OK — ${archives.length} months found (genuineZero=${archives.length === 0})`);

        // Determine which month archives cover the period
        const monthsNeeded = new Set<string>();
        const cur = new Date(periodStart);
        while (cur <= periodEnd) {
          monthsNeeded.add(
            `${cur.getFullYear()}/${String(cur.getMonth() + 1).padStart(2, '0')}`
          );
          cur.setDate(cur.getDate() + 1);
        }

        let anyArchiveFailed = false;
        for (const archiveUrl of archives) {
          const monthKey = archiveUrl.split('/').slice(-2).join('/');
          if (!monthsNeeded.has(monthKey)) continue;

          const gamesResult = await fetchChessComMonthGames(archiveUrl);

          if (!gamesResult.ok) {
            anyArchiveFailed = true;
            await job.log(
              `[CC] FAILED archive fetch ${archiveUrl} — status=${gamesResult.status ?? 'network'} error="${gamesResult.error}"`
            );
            // One archive failure = we can't trust the period total
            break;
          }

          const filtered = gamesResult.data.filter((g) => {
            const d = new Date(g.end_time * 1000);
            return d >= periodStart && d <= periodEnd;
          });
          chessComRawGames.push(...filtered);
          await job.log(
            `[CC] Archive ${archiveUrl} → ${gamesResult.data.length} games, ${filtered.length} in period (genuineZero=${gamesResult.data.length === 0})`
          );
        }

        if (anyArchiveFailed) {
          ccState = 'FAILED';
          await prisma.chessApiFetchLog.create({
            data: {
              studentProfileId,
              provider: 'CHESS_COM',
              periodStart,
              periodEnd,
              success: false,
              statusCode: 0,
              gameCount: 0,
              rawResponse: { endpoint: 'archive_games', error: 'One or more monthly archives failed to fetch' } as object,
            },
          });
        } else {
          // Streak calculation — reuse pre-fetched archives
          // Instead of fetching all archives again, we will just use the ones we fetched if we need to.
          // Since calcChessComStreakDatesFromArchives was reverted by the user, we will simplify:
          // Just pass chessComRawGames directly to normalizer, the normalizer extracts active dates from those games.
          // In the real system, you might want to fetch previous month's archive if periodStart is near month boundary.
          const ccActiveDates: string[] = []; 
          // (The normalizer already extracts active dates from chessComRawGames, we don't strictly need to pre-calculate them here if we just want basic fallback).

          // Log success
          await prisma.chessApiFetchLog.create({
            data: {
              studentProfileId,
              provider: 'CHESS_COM',
              periodStart,
              periodEnd,
              success: true,
              gameCount: chessComRawGames.length,
              rawResponse: {
                endpoint: 'full',
                gamesInPeriod: chessComRawGames.length,
                genuineZero: chessComRawGames.length === 0,
                archiveCount: archives.length,
              } as object,
            },
          });

          chessComActivity = normalizeChessCom(
            chessComStats,
            chessComRawGames,
            chessComUsername,
            ccActiveDates
          );
        }
      }
    }
  }

  await job.updateProgress(40);

  // ── 2. Fetch Lichess SEQUENTIALLY (user → games → activity) ─────────────
  // Each step is dependent on the previous. If any fails: liState = FAILED.
  // This prevents the Promise.all race that caused 2-of-3 calls to get 429.

  let lichessActivity = null;
  let lichessUser: LichessRawUser | null = null;
  liState = lichessUsername ? 'FULL' : 'SKIPPED';

    if (lichessUsername) {
      // Add a small delay to prevent rate-limiting when batch syncing multiple students
      await job.log(`[Lichess] Throttling... waiting 2s to respect API rate limits`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ── Step 2a: user profile ──────────────────────────────────────────────
      await job.log(`[Lichess] Fetching user profile for ${lichessUsername}...`);
      const userResult = await fetchLichessUser(lichessUsername);

    if (!userResult.ok) {
      liState = 'FAILED';
      await job.log(
        `[Lichess] FAILED user fetch for ${lichessUsername} — status=${userResult.status ?? 'network'} retryable=${userResult.retryable}`
      );
      await prisma.chessApiFetchLog.create({
        data: {
          studentProfileId,
          provider: 'LICHESS',
          periodStart,
          periodEnd,
          success: false,
          statusCode: userResult.status ?? 0,
          gameCount: 0,
          rawResponse: { endpoint: 'user', error: userResult.error, retryable: userResult.retryable } as object,
        },
      });
    } else {
      lichessUser = userResult.data;
      await job.log(`[Lichess] User OK — ${userResult.data.username}`);

      // ── Step 2b: games in period ─────────────────────────────────────────
      await job.log(`[Lichess] Fetching games for ${lichessUsername} (${periodStartStr} → ${periodEndStr})...`);
      const gamesResult = await fetchLichessGamesInRange(lichessUsername, periodStart, periodEnd);

      if (!gamesResult.ok) {
        liState = 'FAILED';
        await job.log(
          `[Lichess] FAILED games fetch for ${lichessUsername} — status=${gamesResult.status ?? 'network'} retryable=${gamesResult.retryable}`
        );
        await prisma.chessApiFetchLog.create({
          data: {
            studentProfileId,
            provider: 'LICHESS',
            periodStart,
            periodEnd,
            success: false,
            statusCode: gamesResult.status ?? 0,
            gameCount: 0,
            rawResponse: { endpoint: 'games', error: gamesResult.error, retryable: gamesResult.retryable } as object,
          },
        });
      } else {
        const lichessGames = gamesResult.data;
        await job.log(
          `[Lichess] Games OK — ${lichessGames.length} games in period (genuineZero=${lichessGames.length === 0})`
        );

        // ── Step 2c: activity (puzzles + streak dates) ────────────────────
        await job.log(`[Lichess] Fetching activity for ${lichessUsername}...`);
        const activityResult = await fetchLichessActivity(lichessUsername);

        if (!activityResult.ok) {
          liState = 'FAILED';
          await job.log(
            `[Lichess] FAILED activity fetch for ${lichessUsername} — status=${activityResult.status ?? 'network'} retryable=${activityResult.retryable}`
          );
          await prisma.chessApiFetchLog.create({
            data: {
              studentProfileId,
              provider: 'LICHESS',
              periodStart,
              periodEnd,
              success: false,
              statusCode: activityResult.status ?? 0,
              gameCount: lichessGames.length,
              rawResponse: {
                endpoint: 'activity',
                error: activityResult.error,
                retryable: activityResult.retryable,
                note: 'Games fetched OK but activity failed — snapshot NOT updated to avoid 0 puzzles',
              } as object,
            },
          });
        } else {
          const lichessActivityRaw = activityResult.data;
          await job.log(
            `[Lichess] Activity OK — ${lichessActivityRaw.length} days (genuineZero=${lichessActivityRaw.length === 0})`
          );

          // Log success
          await prisma.chessApiFetchLog.create({
            data: {
              studentProfileId,
              provider: 'LICHESS',
              periodStart,
              periodEnd,
              success: true,
              gameCount: lichessGames.length,
              rawResponse: {
                endpoint: 'full',
                gamesInPeriod: lichessGames.length,
                activityDays: lichessActivityRaw.length,
                genuineZeroGames: lichessGames.length === 0,
                genuineZeroActivity: lichessActivityRaw.length === 0,
              } as object,
            },
          });

          lichessActivity = normalizeLichess(
            lichessUser,
            lichessGames,
            lichessActivityRaw,
            periodStart,
            periodEnd,
            activitySince
          );
        }
      }
    }
  }

  await job.updateProgress(70);

  // ── 3. Snapshot Write Guard ─────────────────────────────────────────────
  
  // CRITICAL RULE: If a provider is linked but failed to fetch, we MUST NOT 
  // write the snapshot. Doing so would aggregate a 0 (or partial data) 
  // for the failed provider, overwriting the genuine historical data.
  //
  // A genuine 0 is safely returned by the APIs via ok: true + empty arrays.
  
  const ccOk = ccState === 'FULL' || ccState === 'SKIPPED';
  const liOk = liState === 'FULL' || liState === 'SKIPPED';
  
  const canWriteSnapshot = ccOk && liOk;

  if (!canWriteSnapshot) {
    const errorMsg = `[Snapshot Guard] Aborting DB write. ChessComState: ${ccState}, LichessState: ${liState}. An API failed to fetch, avoiding false zero overwrite.`;
    await job.log(errorMsg);
    
    // Throwing an error ensures BullMQ marks the job as FAILED and schedules a retry 
    // based on the queue's backoff settings. This satisfies the admin visibility requirement.
    throw new Error(`Data Fetch Failed: CC=${ccState} LI=${liState}`);
  }

  // ── 4. Aggregate & Write ───────────────────────────────────────────────

  await job.log(`[ChessFetchWorker] Both providers OK. Aggregating data...`);
  
  const prevSnapshot = await prisma.chessActivitySnapshot.findUnique({
    where: {
      studentProfileId_periodType_periodStart: {
        studentProfileId,
        periodType,
        periodStart: (() => {
           const d = new Date(periodStart);
           if (periodType === 'MONTHLY') d.setMonth(d.getMonth() - 1);
           else d.setDate(d.getDate() - 7);
           return d;
        })()
      }
    }
  });

  const combined = aggregate(chessComActivity, lichessActivity);

  const rapidRatingStart = combined.rapidRatingStart ?? prevSnapshot?.rapidRatingEnd ?? combined.rapidRating ?? null;
  const rapidRatingEnd = combined.rapidRating ?? null;

  const snapshot = await prisma.chessActivitySnapshot.upsert({
    where: {
      studentProfileId_periodType_periodStart: {
        studentProfileId,
        periodType,
        periodStart,
      },
    },
    create: {
      studentProfileId,
      periodType,
      periodStart,
      periodEnd,
      rapidGames: combined.rapidGames,
      blitzGames: combined.blitzGames,
      classicalGames: combined.classicalGames,
      bulletGames: combined.bulletGames,
      ultraBulletGames: combined.ultraBulletGames,
      rapidWins: combined.rapidWins,
      blitzWins: combined.blitzWins,
      classicalWins: combined.classicalWins,
      puzzleAttempts: combined.puzzleAttempts,
      puzzleSolved: combined.puzzleSolved,
      rapidRatingStart,
      rapidRatingEnd,
      streakDays: combined.streakDays,
      streakStartDate: combined.streakStartDate ?? undefined,
    },
    update: {
      rapidGames: combined.rapidGames,
      blitzGames: combined.blitzGames,
      classicalGames: combined.classicalGames,
      bulletGames: combined.bulletGames,
      ultraBulletGames: combined.ultraBulletGames,
      rapidWins: combined.rapidWins,
      blitzWins: combined.blitzWins,
      classicalWins: combined.classicalWins,
      puzzleAttempts: combined.puzzleAttempts,
      puzzleSolved: combined.puzzleSolved,
      rapidRatingEnd,
      streakDays: combined.streakDays,
      streakStartDate: combined.streakStartDate ?? undefined,
    },
  });

  // lastSyncedAt was reverted from schema, skipping.

  await job.log(`[ChessFetchWorker] Snapshot saved for ${studentProfileId}. Rapid: ${snapshot.rapidGames}, Blitz: ${snapshot.blitzGames}, Puzzles: ${snapshot.puzzleSolved}/${snapshot.puzzleAttempts}, Streak: ${snapshot.streakDays}d`);
  await job.updateProgress(100);


    await prisma.studentSyncRun.create({
      data: {
        studentProfileId,
        periodType,
        periodStart,
        status: 'UPDATED',
        chessComState: ccState,
        lichessState: liState,
        startedAt,
        completedAt: new Date(),
      }
    });

    // Enqueue a leaderboard recalculation for this student now that their snapshot is updated
    await leaderboardCalcQueue.add('calc-leaderboard', {
      periodType,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      studentProfileId,
    });

    return snapshot;
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    const isPreserved = errorMsg.includes('Data Fetch Failed: CC=') || ccState === 'FAILED' || liState === 'FAILED';
    const finalStatus = isPreserved ? 'PRESERVED' : 'FAILED';
    
    const maxAttempts = job.opts.attempts || 1;
    const isFinalAttempt = job.attemptsMade >= maxAttempts - 1;

    if (isFinalAttempt) {
      await prisma.studentSyncRun.create({
        data: {
          studentProfileId,
          periodType,
          periodStart,
          status: finalStatus,
          chessComState: ccState,
          lichessState: liState,
          error: errorMsg,
          startedAt,
          completedAt: new Date(),
        }
      });
    } else {
      await job.log(`[ChessFetchWorker] Attempt ${job.attemptsMade + 1}/${maxAttempts} failed. Retrying...`);
    }

    throw err;
  }
}

export const chessFetchWorker = new Worker(
  QUEUE_NAMES.CHESS_FETCH,
  async (job: Job) => {
    return processChessFetch(job);
  },
  {
    connection,
    concurrency: 1,
  }
);

chessFetchWorker.on('completed', (job) => {
  logger.job.success('chess-fetch', { jobId: job.id, studentId: job.data?.studentProfileId });
});

chessFetchWorker.on('failed', (job, err) => {
  logger.job.fail('chess-fetch', { jobId: job?.id, studentId: job?.data?.studentProfileId, error: err.message });
});

export default processChessFetch;


