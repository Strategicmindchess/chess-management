/**
 * Leaderboard system configuration.
 * All values read from environment variables with sane defaults.
 */

export const LEADERBOARD_CONFIG = {
  /** How often students can trigger a self-refresh (minutes) */
  REFRESH_INTERVAL_MINUTES: parseInt(process.env.REFRESH_INTERVAL_MINUTES ?? '30', 10),

  /** Max concurrent Chess API fetches in the worker */
  MAX_FETCH_CONCURRENCY: parseInt(process.env.MAX_FETCH_CONCURRENCY ?? '3', 10),

  /** Redis cache TTL for leaderboard data (seconds) */
  CACHE_TTL_SECONDS: parseInt(process.env.LEADERBOARD_CACHE_TTL ?? '600', 10),

  /** Secret for the webhook/cron refresh endpoint */
  REFRESH_SECRET: process.env.LEADERBOARD_REFRESH_SECRET ?? 'change-me-in-env',

  /** Leaderboard recalculation mode */
  LEADERBOARD_MODE: (process.env.LEADERBOARD_MODE ?? 'daily') as
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'manual',

  /** Days to look back for streak calculation */
  STREAK_LOOKBACK_DAYS: 35,
} as const;

// ── Point system caps (from AGENTS.md spec) ──────────────────────────────────
export const POINTS = {
  RAPID_CLASSICAL_PER_GAME: 2,
  RAPID_CLASSICAL_MAX_GAMES: 87,
  RAPID_CLASSICAL_MAX_POINTS: 174,

  BLITZ_PER_GAME: 1,
  BLITZ_MAX_GAMES: 51,
  BLITZ_MAX_POINTS: 51,

  PUZZLE_PER_SOLVE: 0.5,
  PUZZLE_MAX_SOLVES: 450,
  PUZZLE_MAX_POINTS: 225,

  WIN_RATE_BONUS_HIGH: 75,     // win% > 50
  WIN_RATE_PENALTY_LOW: -50,   // win% < 50

  PUZZLE_ACCURACY_BONUS_HIGH: 50,   // success% > 70
  PUZZLE_ACCURACY_PENALTY_LOW: -25, // success% < 70

  RATING_BONUS_PER_50: 25,
  RATING_BONUS_MAX: 100,

  STREAK_7: 5,
  STREAK_14: 10,
  STREAK_21: 15,
  STREAK_30: 25,
  STREAK_MAX: 25,

  COACH_FEEDBACK_MAX: 50,
  ATTENDANCE_MAX: 50,
  ASSIGNMENT_MAX: 100,
  TOURNAMENT_MAX: 100,

  BULLET_PENALTY: -200,      // if bullet + ultra-bullet > 50 in period
  BULLET_THRESHOLD: 50,

  TOTAL_MAX: 1000,
} as const;

// ── Redis key prefixes ───────────────────────────────────────────────────────
export const REDIS_KEYS = {
  /** Leaderboard cache: leaderboard:{periodType}:{periodStart} */
  leaderboard: (periodType: string, periodStart: string) =>
    `leaderboard:${periodType}:${periodStart}`,

  /** Student score cache: score:{studentProfileId}:{periodType}:{periodStart} */
  studentScore: (studentId: string, periodType: string, periodStart: string) =>
    `score:${studentId}:${periodType}:${periodStart}`,

  /** Top 10 cache */
  top10: (periodType: string, periodStart: string) =>
    `top10:${periodType}:${periodStart}`,

  /** Refresh lock: lock:refresh:{studentProfileId} */
  refreshLock: (studentId: string) => `lock:refresh:${studentId}`,

  /** Last refresh timestamp: lastRefresh:{studentProfileId} */
  lastRefresh: (studentId: string) => `lastRefresh:${studentId}`,
} as const;

// ── BullMQ Queue names ───────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  CHESS_FETCH: 'chess-fetch',
  LEADERBOARD_CALC: 'leaderboard-calc',
  LOG_CLEANUP: 'log-cleanup',
  ATTENDANCE_SUMMARY: 'attendance-summary',
} as const;

// ── Job names ────────────────────────────────────────────────────────────────
export const JOB_NAMES = {
  FETCH_STUDENT: 'fetch-student',       // Fetch one student's chess data
  FETCH_ALL: 'fetch-all',               // Admin: fetch all students
  CALC_LEADERBOARD: 'calc-leaderboard', // Run score calculation
  PURGE_OLD_LOGS: 'purge-old-logs',     // Delete fetch logs > 30 days
  CALC_ATTENDANCE: 'calc-attendance',   // Calculate attendance % for period
} as const;
