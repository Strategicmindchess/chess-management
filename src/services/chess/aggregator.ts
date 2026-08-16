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
  rapidRatingStart: number | null;
  rapidRating: number | null;
  blitzRating: number | null;

  // ── Streak (union of active dates from both platforms) ──
  streakDays: number;
  streakStartDate: Date | null;
  activeDates: string[]; // all unique dates (YYYY-MM-DD)
}

/** IST offset in milliseconds: UTC+5:30 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Get current date string in IST (YYYY-MM-DD) */
export function getTodayIST(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Convert epoch ms to IST date string (YYYY-MM-DD) */
export function epochToISTDateStr(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Calculate streak from an array of active date strings (YYYY-MM-DD, in IST).
 * Counts backwards from today IST, allowing for a missing today
 * (streak is still alive if yesterday has activity).
 */
export function calcStreak(activeDates: string[]): { streakDays: number; streakStartDate: Date | null } {
  if (activeDates.length === 0) return { streakDays: 0, streakStartDate: null };

  const set = new Set(activeDates);
  const nowMs = Date.now();
  const todayIST  = epochToISTDateStr(nowMs);
  const yestIST   = epochToISTDateStr(nowMs - 86_400_000);

  // Start from today if active, else try yesterday — streak can be alive even if today isn't logged yet
  const startIST = set.has(todayIST) ? todayIST : yestIST;
  if (!set.has(startIST)) return { streakDays: 0, streakStartDate: null };

  let streakDays = 0;
  let streakStartDate: Date | null = null;
  // Walk backwards day-by-day from startIST
  let checkMs = set.has(todayIST) ? nowMs : nowMs - 86_400_000;

  while (true) {
    const checkIST = epochToISTDateStr(checkMs);
    if (set.has(checkIST)) {
      streakDays++;
      streakStartDate = new Date(checkMs); // UTC epoch — caller can format
      checkMs -= 86_400_000;
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

  const bothLinked = cc !== null && li !== null;

  // Helper to average or take the existing one
  const avg = (a: number = 0, b: number = 0) => bothLinked ? Math.round((a + b) / 2) : (a + b);

  const rapidGames = avg(cc?.rapidGames, li?.rapidGames);
  const rapidWins = avg(cc?.rapidWins, li?.rapidWins);
  const rapidLosses = avg(cc?.rapidLosses, li?.rapidLosses);
  const rapidDraws = avg(cc?.rapidDraws, li?.rapidDraws);

  const blitzGames = avg(cc?.blitzGames, li?.blitzGames);
  const blitzWins = avg(cc?.blitzWins, li?.blitzWins);
  const blitzLosses = avg(cc?.blitzLosses, li?.blitzLosses);
  const blitzDraws = avg(cc?.blitzDraws, li?.blitzDraws);

  const classicalGames = avg(cc?.classicalGames, li?.classicalGames);
  const classicalWins = avg(cc?.classicalWins, li?.classicalWins);

  const bulletGames = avg(cc?.bulletGames, li?.bulletGames);
  const ultraBulletGames = avg(cc?.ultraBulletGames, li?.ultraBulletGames);

  // Puzzles
  const puzzleAttempts = avg(cc?.puzzleAttempts, li?.puzzleAttempts);
  const puzzleSolved = avg(cc?.puzzleSolved, li?.puzzleSolved);
  const puzzleSuccessRate = puzzleAttempts > 0 ? Math.round((puzzleSolved / puzzleAttempts) * 100) : null;

  // Rating — prefer Chess.com, fallback Lichess
  const rapidRatingStart = cc?.rapidRatingStart ?? li?.rapidRatingStart ?? null;
  const rapidRating = cc?.rapidRating ?? li?.rapidRating ?? null;
  const blitzRating = cc?.blitzRating ?? li?.blitzRating ?? null;

  // Streak — max of both platforms
  const ccStreakData = calcStreak(cc?.activeDates ?? []);
  const liStreakData = calcStreak(li?.activeDates ?? []);
  
  let streakDays = 0;
  let streakStartDate: Date | null = null;
  
  if (ccStreakData.streakDays >= liStreakData.streakDays) {
    streakDays = ccStreakData.streakDays;
    streakStartDate = ccStreakData.streakStartDate;
  } else {
    streakDays = liStreakData.streakDays;
    streakStartDate = liStreakData.streakStartDate;
  }

  // Active dates — union (still useful for UI/debugging)
  const allDatesSet = new Set([
    ...(cc?.activeDates ?? []),
    ...(li?.activeDates ?? []),
  ]);
  const activeDates = [...allDatesSet].sort();

  return {
    rapidGames, rapidWins, rapidLosses, rapidDraws,
    blitzGames, blitzWins, blitzLosses, blitzDraws,
    classicalGames, classicalWins,
    bulletGames, ultraBulletGames,
    puzzleAttempts, puzzleSolved, puzzleSuccessRate,
    rapidRatingStart, rapidRating, blitzRating,
    streakDays, streakStartDate,
    activeDates,
  };
}
