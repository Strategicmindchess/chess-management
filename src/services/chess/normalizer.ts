/**
 * Normalizer — converts Chess.com and Lichess raw API responses
 * into a unified internal DTO (ChessActivity).
 *
 * This layer is intentionally pure: no DB calls, no side effects.
 */

import type { ChessComRawGame } from './chesscom';
import type { LichessRawUser, LichessRawActivityEntry } from './lichess';
import { epochToISTDateStr } from './aggregator';

/**
 * Unified chess activity DTO.
 * All fields are scoped to the period (start→end) passed to the normalizer.
 */
export interface ChessActivity {
  // Game counts (period-specific)
  rapidGames: number;
  rapidWins: number;
  rapidLosses: number;
  rapidDraws: number;

  blitzGames: number;
  blitzWins: number;
  blitzLosses: number;
  blitzDraws: number;

  classicalGames: number;
  classicalWins: number;
  classicalLosses: number;
  classicalDraws: number;

  bulletGames: number;
  bulletWins: number;

  ultraBulletGames: number;

  // Puzzle data (period-specific)
  puzzleAttempts: number;
  puzzleSolved: number;
  puzzleSuccessRate: number | null; // 0–100

  // Rating
  rapidRatingStart: number | null;
  rapidRating: number | null;
  blitzRating: number | null;

  // Daily activity dates (for streak calc)
  activeDates: string[]; // YYYY-MM-DD, deduplicated
}

// ──────────────────────────────────────────────────────────────────────────────
// Chess.com normalization
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Normalize Chess.com raw stats + period games into ChessActivity.
 * `periodGames` = games fetched for the specific period (already filtered by date).
 */
export function normalizeChessCom(
  stats: Record<string, any> | null,
  periodGames: ChessComRawGame[],
  username: string,
  activeDates: string[]
): ChessActivity {
  let rapidGames = 0, rapidWins = 0, rapidLosses = 0, rapidDraws = 0;
  let blitzGames = 0, blitzWins = 0, blitzLosses = 0, blitzDraws = 0;
  let classicalGames = 0, classicalWins = 0, classicalLosses = 0, classicalDraws = 0;
  let bulletGames = 0, bulletWins = 0;
  let ultraBulletGames = 0;
  let rapidRatingStart: number | null = null;

  // Sort games chronologically to extract the starting rating from the first game
  const sortedGames = [...periodGames].sort((a, b) => a.end_time - b.end_time);

  for (const game of sortedGames) {
    if (game.rules !== 'chess') continue; // skip variants

    const playerSide =
      game.white.username.toLowerCase() === username.toLowerCase() ? 'white' : 'black';
    const playerData = playerSide === 'white' ? game.white : game.black;

    const isWin = playerData.result === 'win';
    const isLoss = playerData.result === 'lose' || playerData.result === 'checkmated' ||
                   playerData.result === 'timeout' || playerData.result === 'resigned';
    const isDraw = !isWin && !isLoss;

    const tc = game.time_class.toLowerCase();

    // Do not count abandoned games at all
    if (playerData.result === 'abandoned') {
      continue;
    }

    if (tc === 'rapid') {
      rapidGames++;
      if (isWin) rapidWins++;
      else if (isLoss) rapidLosses++;
      else if (isDraw) rapidDraws++;
      
      if (rapidRatingStart === null) {
        rapidRatingStart = playerData.rating;
      }
    } else if (tc === 'blitz') {
      blitzGames++;
      if (isWin) blitzWins++;
      else if (isLoss) blitzLosses++;
      else if (isDraw) blitzDraws++;
    } else if (tc === 'daily' || tc === 'classical') {
      classicalGames++;
      if (isWin) classicalWins++;
      else if (isLoss) classicalLosses++;
      else if (isDraw) classicalDraws++;
    } else if (tc === 'bullet') {
      bulletGames++;
      if (isWin) bulletWins++;
    } else if (tc === 'ultraBullet' || tc === 'ultra_bullet') {
      ultraBulletGames++;
    }
  }

  // Puzzle data on Chess.com cannot be fetched per-period without OAuth.
  // Using lifetime best/tactics is incorrect for a monthly leaderboard.
  const puzzleAttempts = 0;
  const puzzleSolved = 0;
  const puzzleSuccessRate = null;

  const rapidRating = stats?.chess_rapid?.last?.rating ?? null;
  const blitzRating = stats?.chess_blitz?.last?.rating ?? null;

  return {
    rapidGames, rapidWins, rapidLosses, rapidDraws,
    blitzGames, blitzWins, blitzLosses, blitzDraws,
    classicalGames, classicalWins, classicalLosses, classicalDraws,
    bulletGames, bulletWins,
    ultraBulletGames,
    puzzleAttempts,
    puzzleSolved,
    puzzleSuccessRate,
    rapidRatingStart,
    rapidRating,
    blitzRating,
    activeDates,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Lichess normalization
// ──────────────────────────────────────────────────────────────────────────────

export function normalizeLichess(
  user: LichessRawUser | null,
  periodGames: Array<Record<string, unknown>>,
  activity: LichessRawActivityEntry[],
  since: Date,
  until: Date,
  activitySince: Date = since
): ChessActivity {
  let rapidGames = 0, rapidWins = 0, rapidLosses = 0, rapidDraws = 0;
  let blitzGames = 0, blitzWins = 0, blitzLosses = 0, blitzDraws = 0;
  let classicalGames = 0, classicalWins = 0, classicalLosses = 0, classicalDraws = 0;
  let bulletGames = 0, bulletWins = 0;
  let ultraBulletGames = 0;
  let rapidRatingStart: number | null = null;

  const username = user?.username?.toLowerCase() ?? '';
  const sortedGames = [...periodGames].sort((a, b) => (a.createdAt as number) - (b.createdAt as number));

  for (const game of sortedGames) {
    const speed = (game.speed as string)?.toLowerCase() ?? '';
    const players = game.players as Record<string, Record<string, unknown>> | undefined;
    const whiteUser = (players?.white?.user as Record<string, string> | undefined)?.name?.toLowerCase();
    const playerSide = whiteUser === username ? 'white' : 'black';
    const winner = game.winner as string | undefined;
    const isWin = winner === playerSide;
    const status = game.status as string | undefined;

    // Do not count aborted or unstarted games at all
    if (status === 'aborted' || status === 'noStart') {
      continue;
    }

    const isDraw = status === 'draw' || status === 'stalemate';
    const isLoss = !isWin && !isDraw;

    if (speed === 'rapid') {
      rapidGames++; 
      if (isWin) rapidWins++; else if (isLoss) rapidLosses++; else rapidDraws++;
      if (rapidRatingStart === null) {
        const p = players?.[playerSide] as Record<string, any>;
        rapidRatingStart = p?.rating ?? null;
      }
    } else if (speed === 'blitz') {
      blitzGames++; if (isWin) blitzWins++; else if (isLoss) blitzLosses++; else blitzDraws++;
    } else if (speed === 'classical' || speed === 'correspondence') {
      classicalGames++; if (isWin) classicalWins++; else if (isLoss) classicalLosses++; else classicalDraws++;
    } else if (speed === 'bullet') {
      bulletGames++; if (isWin) bulletWins++;
    } else if (speed === 'ultraBullet' || speed === 'ultraballet') {
      ultraBulletGames++;
    }
  }

  // Puzzles from activity (use activitySince to allow longer streaks)
  let puzzleAttempts = 0, puzzleSolved = 0;
  const activeDates: string[] = [];
  const sinceMs = since.getTime();
  const activitySinceMs = activitySince.getTime();
  const untilMs = until.getTime();

  for (const entry of activity) {
    const ts = entry.interval?.start;
    // We only skip if it's older than activitySince
    if (!ts || ts < activitySinceMs || ts > untilMs) continue;

    const dateStr = epochToISTDateStr(ts);

    // Only count puzzles if they are within the actual period (sinceMs)
    if (entry.puzzles && ts >= sinceMs) {
      const score = entry.puzzles.score;
      const win = score?.win ?? 0;
      const loss = score?.loss ?? 0;
      const draw = score?.draw ?? 0;
      puzzleAttempts += win + loss + draw;
      puzzleSolved += win;
    }

    if (entry.games || entry.puzzles || entry.storm || entry.practice) {
      activeDates.push(dateStr);
    }
  }

  const puzzleSuccessRate =
    puzzleAttempts > 0 ? Math.round((puzzleSolved / puzzleAttempts) * 100) : null;

  const rapidRating = user?.perfs?.rapid?.rating ?? null;
  const blitzRating = user?.perfs?.blitz?.rating ?? null;

  return {
    rapidGames, rapidWins, rapidLosses, rapidDraws,
    blitzGames, blitzWins, blitzLosses, blitzDraws,
    classicalGames, classicalWins, classicalLosses, classicalDraws,
    bulletGames, bulletWins,
    ultraBulletGames,
    puzzleAttempts,
    puzzleSolved,
    puzzleSuccessRate,
    rapidRatingStart,
    rapidRating,
    blitzRating,
    activeDates: [...new Set(activeDates)],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Lifetime Stats Extraction
// ──────────────────────────────────────────────────────────────────────────────

import { calcStreak } from './aggregator';

export function extractLifetimeStats(
  ccStats: Record<string, any> | null,
  liUser: LichessRawUser | null,
  ccActiveDates: string[] = [],
  liActiveDates: string[] = []
) {
  // Chess.com
  const ccRapid = ccStats?.chess_rapid;
  const ccBlitz = ccStats?.chess_blitz;
  const ccBullet = ccStats?.chess_bullet;
  const ccTactics = ccStats?.tactics;

  const ccTotalRapid = ccRapid?.record ? ccRapid.record.win + ccRapid.record.loss + ccRapid.record.draw : null;
  const ccTotalBlitz = ccBlitz?.record ? ccBlitz.record.win + ccBlitz.record.loss + ccBlitz.record.draw : null;
  const ccTotalBullet = ccBullet?.record ? ccBullet.record.win + ccBullet.record.loss + ccBullet.record.draw : null;

  // Lichess
  const liRapid = liUser?.perfs?.rapid;
  const liBlitz = liUser?.perfs?.blitz;
  const liBullet = liUser?.perfs?.bullet;
  const liPuzzle = liUser?.perfs?.puzzle;

  const ccStreak = calcStreak(ccActiveDates).streakDays;
  const liStreak = calcStreak(liActiveDates).streakDays;

  return {
    ccRapidRating: ccRapid?.last?.rating ?? null,
    ccBlitzRating: ccBlitz?.last?.rating ?? null,
    ccBulletRating: ccBullet?.last?.rating ?? null,
    ccTotalRapid,
    ccTotalBlitz,
    ccTotalBullet,
    ccPuzzleRating: ccTactics?.highest?.rating ?? null,
    ccStreak,
    liRapidRating: liRapid?.rating ?? null,
    liBlitzRating: liBlitz?.rating ?? null,
    liBulletRating: liBullet?.rating ?? null,
    liTotalRapid: liRapid?.games ?? null,
    liTotalBlitz: liBlitz?.games ?? null,
    liTotalBullet: liBullet?.games ?? null,
    liPuzzleRating: liPuzzle?.rating ?? null,
    liStreak,
  };
}
