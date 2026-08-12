/**
 * Aggregator — merges Chess.com DTO + Lichess DTO into CombinedActivity.
 * Pure function, no DB, no API calls, no side effects.
 */

import type { ChessActivity } from './normalizer';

export interface CombinedActivity {
  // ── Combined game counts ──
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

  bulletGames: number;
  ultraBulletGames: number;

  // ── Combined puzzle counts ──
  puzzleAttempts: number;
  puzzleSolved: number;
  puzzleSuccessRate: number | null; // weighted average, 0–100

  // ── Rating (prefer Chess.com, fallback Lichess) ──
  rapidRating: number | null;
  blitzRating: number | null;

  // ── Streak (union of active dates from both platforms) ──
  streakDays: number;
  streakStartDate: Date | null;
  activeDates: string[]; // all unique dates (YYYY-MM-DD)
}

/**
 * Calculate streak from an array of active date strings (YYYY-MM-DD).
 * Counts backwards from today — stops on first missing day.
 */
function calcStreak(activeDates: string[]): { streakDays: number; streakStartDate: Date | null } {
  const set = new Set(activeDates);
  let streakDays = 0;
  let streakStartDate: Date | null = null;
  const today = new Date();

  for (let i = 0; i <= 35; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (set.has(ds)) {
      streakDays++;
      streakStartDate = d;
    } else {
      break;
    }
  }

  return { streakDays, streakStartDate };
}

/**
 * Merge Chess.com activity DTO + Lichess activity DTO into one CombinedActivity.
 * Either DTO may be null if that platform is not linked.
 */
export function aggregate(
  chessCom: ChessActivity | null,
  lichess: ChessActivity | null
): CombinedActivity {
  const cc = chessCom;
  const li = lichess;

  const rapidGames = (cc?.rapidGames ?? 0) + (li?.rapidGames ?? 0);
  const rapidWins = (cc?.rapidWins ?? 0) + (li?.rapidWins ?? 0);
  const rapidLosses = (cc?.rapidLosses ?? 0) + (li?.rapidLosses ?? 0);
  const rapidDraws = (cc?.rapidDraws ?? 0) + (li?.rapidDraws ?? 0);

  const blitzGames = (cc?.blitzGames ?? 0) + (li?.blitzGames ?? 0);
  const blitzWins = (cc?.blitzWins ?? 0) + (li?.blitzWins ?? 0);
  const blitzLosses = (cc?.blitzLosses ?? 0) + (li?.blitzLosses ?? 0);
  const blitzDraws = (cc?.blitzDraws ?? 0) + (li?.blitzDraws ?? 0);

  const classicalGames = (cc?.classicalGames ?? 0) + (li?.classicalGames ?? 0);
  const classicalWins = (cc?.classicalWins ?? 0) + (li?.classicalWins ?? 0);

  const bulletGames = (cc?.bulletGames ?? 0) + (li?.bulletGames ?? 0);
  const ultraBulletGames = (cc?.ultraBulletGames ?? 0) + (li?.ultraBulletGames ?? 0);

  // Puzzles — combine totals
  const puzzleAttempts = (cc?.puzzleAttempts ?? 0) + (li?.puzzleAttempts ?? 0);
  const puzzleSolved = (cc?.puzzleSolved ?? 0) + (li?.puzzleSolved ?? 0);
  const puzzleSuccessRate =
    puzzleAttempts > 0
      ? Math.round((puzzleSolved / puzzleAttempts) * 100)
      : null;

  // Rating — prefer Chess.com, fallback Lichess
  const rapidRating = cc?.rapidRating ?? li?.rapidRating ?? null;
  const blitzRating = cc?.blitzRating ?? li?.blitzRating ?? null;

  // Streak — union of both platforms' active dates
  const allDatesSet = new Set([
    ...(cc?.activeDates ?? []),
    ...(li?.activeDates ?? []),
  ]);
  const activeDates = [...allDatesSet].sort();
  const { streakDays, streakStartDate } = calcStreak(activeDates);

  return {
    rapidGames, rapidWins, rapidLosses, rapidDraws,
    blitzGames, blitzWins, blitzLosses, blitzDraws,
    classicalGames, classicalWins,
    bulletGames, ultraBulletGames,
    puzzleAttempts, puzzleSolved, puzzleSuccessRate,
    rapidRating, blitzRating,
    streakDays, streakStartDate,
    activeDates,
  };
}
