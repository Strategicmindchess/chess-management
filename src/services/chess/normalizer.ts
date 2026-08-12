/**
 * Normalizer — converts Chess.com and Lichess raw API responses
 * into a unified internal DTO (ChessActivity).
 *
 * This layer is intentionally pure: no DB calls, no side effects.
 */

import type { ChessComRawStats, ChessComRawGame } from './chesscom';
import type { LichessRawUser, LichessRawActivityEntry } from './lichess';

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

  // Rating (current snapshot — not period-diff)
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
  stats: ChessComRawStats | null,
  periodGames: ChessComRawGame[],
  username: string,
  activeDates: string[]
): ChessActivity {
  let rapidGames = 0, rapidWins = 0, rapidLosses = 0, rapidDraws = 0;
  let blitzGames = 0, blitzWins = 0, blitzLosses = 0, blitzDraws = 0;
  let classicalGames = 0, classicalWins = 0, classicalLosses = 0, classicalDraws = 0;
  let bulletGames = 0, bulletWins = 0;
  let ultraBulletGames = 0;

  for (const game of periodGames) {
    if (game.rules !== 'chess') continue; // skip variants

    const playerSide =
      game.white.username.toLowerCase() === username.toLowerCase() ? 'white' : 'black';
    const playerData = playerSide === 'white' ? game.white : game.black;

    const isWin = playerData.result === 'win';
    const isLoss = playerData.result === 'lose' || playerData.result === 'checkmated' ||
                   playerData.result === 'timeout' || playerData.result === 'resigned';
    const isDraw = !isWin && !isLoss;

    const tc = game.time_class.toLowerCase();

    if (tc === 'rapid') {
      rapidGames++;
      if (isWin) rapidWins++;
      else if (isLoss) rapidLosses++;
      else if (isDraw) rapidDraws++;
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

  // Puzzle (from lifetime stats — Chess.com doesn't expose period puzzles without OAuth)
  const tactics = stats?.tactics;
  const puzzleRush = stats?.puzzle_rush;
  const rushBest = puzzleRush?.best;
  const rushDaily = puzzleRush?.daily;

  // Approximate: tactics = lifetime, puzzle_rush = period proxy
  const puzzleAttempts = rushBest?.total_attempts ?? 0;
  const puzzleSolved = rushBest?.score ?? 0;
  const puzzleSuccessRate =
    puzzleAttempts > 0 ? Math.round((puzzleSolved / puzzleAttempts) * 100) : null;

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
    rapidRating,
    blitzRating,
    activeDates,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Lichess normalization
// ──────────────────────────────────────────────────────────────────────────────

/** Normalize Lichess raw user data + period games + activity into ChessActivity */
export function normalizeLichess(
  user: LichessRawUser | null,
  periodGames: Array<Record<string, unknown>>,
  activity: LichessRawActivityEntry[],
  since: Date,
  until: Date
): ChessActivity {
  let rapidGames = 0, rapidWins = 0, rapidLosses = 0, rapidDraws = 0;
  let blitzGames = 0, blitzWins = 0, blitzLosses = 0, blitzDraws = 0;
  let classicalGames = 0, classicalWins = 0, classicalLosses = 0, classicalDraws = 0;
  let bulletGames = 0, bulletWins = 0;
  let ultraBulletGames = 0;

  const username = user?.username?.toLowerCase() ?? '';

  for (const game of periodGames) {
    const speed = (game.speed as string)?.toLowerCase() ?? '';
    const players = game.players as Record<string, Record<string, unknown>> | undefined;
    const whiteUser = (players?.white?.user as Record<string, string> | undefined)?.name?.toLowerCase();
    const playerSide = whiteUser === username ? 'white' : 'black';
    const winner = game.winner as string | undefined;
    const isWin = winner === playerSide;
    const status = game.status as string | undefined;
    const isDraw = status === 'draw' || status === 'stalemate';
    const isLoss = !isWin && !isDraw;

    if (speed === 'rapid') {
      rapidGames++; if (isWin) rapidWins++; else if (isLoss) rapidLosses++; else rapidDraws++;
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

  // Puzzles from activity (period-specific)
  let puzzleAttempts = 0, puzzleSolved = 0;
  const activeDates: string[] = [];
  const sinceMs = since.getTime();
  const untilMs = until.getTime();

  for (const entry of activity) {
    const ts = entry.interval?.start;
    if (!ts || ts < sinceMs || ts > untilMs) continue;

    const dateStr = new Date(ts).toISOString().slice(0, 10);

    if (entry.puzzles) {
      const score = entry.puzzles.score;
      puzzleAttempts += score.win + score.loss + score.draw;
      puzzleSolved += score.win;
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
    rapidRating,
    blitzRating,
    activeDates: [...new Set(activeDates)],
  };
}
