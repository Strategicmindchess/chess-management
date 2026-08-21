/**
 * Lichess.org Public API wrapper — raw data only, no normalization.
 * Docs: https://lichess.org/api
 * No API key required for public user data.
 *
 * All functions return ApiResult<T> so callers can distinguish
 * genuine empty data (ok: true, data: []) from failed requests (ok: false).
 *
 * fetchLichessGamesInRange uses apiNdjsonFetch — same retry policy as apiFetch.
 */

import { apiFetch, apiNdjsonFetch, type ApiResult } from './api-fetch';

const BASE = 'https://lichess.org';
const OPTS = { label: '[Lichess]' };

export interface LichessPerf {
  games: number;
  rating: number;
  rd?: number;
  prog?: number;
  prov?: boolean;
}

export interface LichessRawUser {
  id: string;
  username: string;
  perfs: {
    ultraBullet?: LichessPerf;
    bullet?: LichessPerf;
    blitz?: LichessPerf;
    rapid?: LichessPerf;
    classical?: LichessPerf;
    puzzle?: LichessPerf;
    storm?: { runs?: number; score?: number };
    racer?: { runs?: number; score?: number };
    streak?: { runs?: number; score?: number };
  };
  count?: {
    all: number;
    rated: number;
    ai: number;
    draw: number;
    drawH: number;
    loss: number;
    lossH: number;
    win: number;
    winH: number;
  };
  playTime?: {
    total: number;
    tv: number;
  };
  createdAt?: number;
  seenAt?: number;
}

export interface LichessRawActivityEntry {
  interval: {
    start: number;
    end: number;
  };
  games?: {
    [perf: string]: {
      win: number;
      loss: number;
      draw: number;
      rp?: {
        before: number;
        after: number;
      };
    };
  };
  puzzles?: {
    score: {
      win: number;
      loss: number;
      draw: number;
      rp?: {
        before: number;
        after: number;
      };
    };
  };
  storm?: {
    runs: number;
    score: number;
  };
  practice?: Record<string, number>;
  tournaments?: {
    nb: number;
    best: Array<{ tournament: { id: string; name: string }; nbGames: number; score: number; rank: number }>;
  };
}

let lastLichessCall = 0;
async function throttleLichess() {
  const now = Date.now();
  const timeSinceLast = now - lastLichessCall;
  if (timeSinceLast < 1000) {
    await new Promise(r => setTimeout(r, 1000 - timeSinceLast));
  }
  lastLichessCall = Date.now();
}

/** Fetch Lichess user profile with all perfs */
export async function fetchLichessUser(username: string): Promise<ApiResult<LichessRawUser>> {
  await throttleLichess();
  return apiFetch<LichessRawUser>(
    `${BASE}/api/user/${encodeURIComponent(username)}`,
    OPTS
  );
}

/** Fetch Lichess daily activity (last ~40 days, public endpoint) */
export async function fetchLichessActivity(username: string): Promise<ApiResult<LichessRawActivityEntry[]>> {
  await throttleLichess();
  return apiFetch<LichessRawActivityEntry[]>(
    `${BASE}/api/user/${encodeURIComponent(username)}/activity`,
    OPTS
  );
}

/**
 * Fetch Lichess games in a date range via NDJSON streaming endpoint.
 * Uses apiNdjsonFetch — same retry/backoff as apiFetch.
 * Returns ApiResult<Array<Record<string, unknown>>>.
 * ok: true + data: [] = genuine zero (player had no games in period).
 * ok: false = fetch failed after retries — caller must NOT treat as zero.
 */
export async function fetchLichessGamesInRange(
  username: string,
  since: Date,
  until: Date
): Promise<ApiResult<Array<Record<string, unknown>>>> {
  await throttleLichess();
  const url =
    `${BASE}/api/games/user/${encodeURIComponent(username)}` +
    `?since=${since.getTime()}&until=${until.getTime()}` +
    `&perfType=rapid,blitz,classical,bullet,ultraBullet` +
    `&clocks=false&evals=false&opening=false`;

  return apiNdjsonFetch<Record<string, unknown>>(url, OPTS);
}

/** Verify a Lichess username exists */
export async function verifyLichessUser(username: string): Promise<boolean> {
  await throttleLichess();
  const result = await apiFetch<Record<string, unknown>>(
    `${BASE}/api/user/${encodeURIComponent(username)}`,
    OPTS
  );
  return result.ok;
}
