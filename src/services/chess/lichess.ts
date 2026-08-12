/**
 * Lichess.org Public API wrapper — raw data only, no normalization.
 * Docs: https://lichess.org/api
 * No API key required for public user data.
 */

const BASE = 'https://lichess.org';

const HEADERS: Record<string, string> = {
  'User-Agent': 'SMC-CRM/1.0 (chess@strategicmindchess.in)',
  Accept: 'application/json',
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`[Lichess] API error ${res.status} for ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[Lichess] Fetch failed for ${url}:`, err);
    return null;
  }
}

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

/** Fetch Lichess user profile with all perfs */
export async function fetchLichessUser(username: string): Promise<LichessRawUser | null> {
  return fetchJson<LichessRawUser>(
    `${BASE}/api/user/${encodeURIComponent(username)}`
  );
}

/** Fetch Lichess daily activity (last ~40 days, public endpoint) */
export async function fetchLichessActivity(username: string): Promise<LichessRawActivityEntry[]> {
  const data = await fetchJson<LichessRawActivityEntry[]>(
    `${BASE}/api/user/${encodeURIComponent(username)}/activity`
  );
  return data ?? [];
}

/**
 * Fetch Lichess games in a date range via NDJSON streaming endpoint.
 * Returns parsed game objects.
 */
export async function fetchLichessGamesInRange(
  username: string,
  since: Date,
  until: Date
): Promise<Array<Record<string, unknown>>> {
  const url =
    `${BASE}/api/games/user/${encodeURIComponent(username)}` +
    `?since=${since.getTime()}&until=${until.getTime()}` +
    `&perfType=rapid,blitz,classical,bullet,ultraBullet` +
    `&clocks=false&evals=false&opening=false`;

  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, Accept: 'application/x-ndjson' },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[Lichess] Games range error ${res.status}`);
      return [];
    }
    const text = await res.text();
    const games: Array<Record<string, unknown>> = [];
    for (const line of text.trim().split('\n').filter(Boolean)) {
      try {
        games.push(JSON.parse(line));
      } catch { /* skip */ }
    }
    return games;
  } catch (err) {
    console.error('[Lichess] Games range fetch failed:', err);
    return [];
  }
}

/** Verify a Lichess username exists */
export async function verifyLichessUser(username: string): Promise<boolean> {
  const data = await fetchJson<Record<string, unknown>>(
    `${BASE}/api/user/${encodeURIComponent(username)}`
  );
  return data !== null;
}
