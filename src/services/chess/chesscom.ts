/**
 * Chess.com Public API wrapper — raw data only, no normalization.
 * Docs: https://www.chess.com/news/view/published-data-api
 * No API key required for public data.
 */

const BASE = 'https://api.chess.com/pub';

const HEADERS: Record<string, string> = {
  'User-Agent': 'SMC-CRM/1.0 (chess@strategicmindchess.in)',
  Accept: 'application/json',
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`[ChessCom] API error ${res.status} for ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[ChessCom] Fetch failed for ${url}:`, err);
    return null;
  }
}

export interface ChessComRawStats {
  chess_rapid?: {
    last?: { rating: number; date: number; rd: number };
    best?: { rating: number; date: number; game: string };
    record?: { win: number; loss: number; draw: number; time_per_move: number; timeout_percent: number };
  };
  chess_blitz?: {
    last?: { rating: number; date: number; rd: number };
    best?: { rating: number; date: number; game: string };
    record?: { win: number; loss: number; draw: number };
  };
  chess_bullet?: {
    last?: { rating: number; date: number; rd: number };
    record?: { win: number; loss: number; draw: number };
  };
  chess_daily?: {
    last?: { rating: number; date: number; rd: number };
    record?: { win: number; loss: number; draw: number };
  };
  tactics?: {
    highest?: { rating: number; date: number };
    lowest?: { rating: number; date: number };
  };
  puzzle_rush?: {
    best?: { total_attempts: number; score: number };
    daily?: { total_attempts: number; score: number };
  };
}

export interface ChessComRawGame {
  url: string;
  pgn?: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  accuracies?: { white: number; black: number };
  tcn?: string;
  uuid?: string;
  initial_setup?: string;
  fen?: string;
  time_class: string; // 'rapid' | 'blitz' | 'bullet' | 'daily'
  rules: string;      // 'chess' | 'chess960' | etc.
  white: { rating: number; result: string; '@id': string; username: string; uuid: string };
  black: { rating: number; result: string; '@id': string; username: string; uuid: string };
}

/** Fetch Chess.com player stats (lifetime data) */
export async function fetchChessComStats(username: string): Promise<ChessComRawStats | null> {
  return fetchJson<ChessComRawStats>(`${BASE}/player/${encodeURIComponent(username)}/stats`);
}

/** Get list of available monthly archive URLs for a player */
export async function fetchChessComArchives(username: string): Promise<string[]> {
  const data = await fetchJson<{ archives: string[] }>(
    `${BASE}/player/${encodeURIComponent(username)}/games/archives`
  );
  return data?.archives ?? [];
}

/** Fetch all games from one monthly archive */
export async function fetchChessComMonthGames(archiveUrl: string): Promise<ChessComRawGame[]> {
  const data = await fetchJson<{ games: ChessComRawGame[] }>(archiveUrl);
  return data?.games ?? [];
}

/** Fetch Lichess-style daily activity from Chess.com (via archive scan) */
export async function fetchChessComActivity(
  username: string,
  since: Date,
  until: Date
): Promise<{ date: string; hasActivity: boolean }[]> {
  const archives = await fetchChessComArchives(username);

  const monthsNeeded = new Set<string>();
  const cur = new Date(since);
  while (cur <= until) {
    monthsNeeded.add(`${cur.getFullYear()}/${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setDate(cur.getDate() + 1);
  }

  const activeDates = new Set<string>();
  for (const archiveUrl of archives) {
    const monthKey = archiveUrl.split('/').slice(-2).join('/');
    if (!monthsNeeded.has(monthKey)) continue;
    const games = await fetchChessComMonthGames(archiveUrl);
    for (const g of games) {
      const d = new Date(g.end_time * 1000);
      if (d >= since && d <= until) {
        activeDates.add(d.toISOString().slice(0, 10));
      }
    }
  }

  const result: { date: string; hasActivity: boolean }[] = [];
  const d = new Date(since);
  while (d <= until) {
    const ds = d.toISOString().slice(0, 10);
    result.push({ date: ds, hasActivity: activeDates.has(ds) });
    d.setDate(d.getDate() + 1);
  }
  return result;
}

/** Verify a Chess.com username exists */
export async function verifyChessComUser(username: string): Promise<boolean> {
  const data = await fetchJson<Record<string, unknown>>(
    `${BASE}/player/${encodeURIComponent(username)}`
  );
  return data !== null;
}
