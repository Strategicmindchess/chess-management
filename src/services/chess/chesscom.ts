/**
 * Chess.com Public API wrapper — raw data only, no normalization.
 * Docs: https://www.chess.com/news/view/published-data-api
 */

import { apiFetch, type ApiResult } from './api-fetch';

const BASE = 'https://api.chess.com/pub';
const OPTS = { label: '[ChessCom]' };

export interface ChessComRawGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  tcn: string;
  uuid: string;
  initial_setup: string;
  fen: string;
  time_class: string;
  rules: string;
  white: {
    rating: number;
    result: string;
    '@id': string;
    username: string;
    uuid: string;
  };
  black: {
    rating: number;
    result: string;
    '@id': string;
    username: string;
    uuid: string;
  };
}

/** Fetch a player's stats (ratings, win/loss records) */
export async function fetchChessComStats(username: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiFetch<Record<string, unknown>>(
    `${BASE}/player/${encodeURIComponent(username)}/stats`,
    OPTS
  );
}

/** Fetch a player's profile (registration date, last online, etc) */
export async function fetchChessComProfile(username: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiFetch<Record<string, unknown>>(
    `${BASE}/player/${encodeURIComponent(username)}`,
    OPTS
  );
}

/** Fetch all available monthly archive URLs for a player */
export async function fetchChessComArchives(username: string): Promise<ApiResult<string[]>> {
  const result = await apiFetch<{ archives: string[] }>(
    `${BASE}/player/${encodeURIComponent(username)}/games/archives`,
    OPTS
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.archives ?? [], status: result.status, attempts: result.attempts };
}

/** Fetch all games from one monthly archive */
export async function fetchChessComMonthGames(archiveUrl: string): Promise<ApiResult<ChessComRawGame[]>> {
  const result = await apiFetch<{ games: ChessComRawGame[] }>(archiveUrl, OPTS);
  if (!result.ok) return result;
  return { ok: true, data: result.data.games ?? [], status: result.status, attempts: result.attempts };
}

/** Verify a Chess.com username exists */
export async function verifyChessComUser(username: string): Promise<boolean> {
  const result = await apiFetch<Record<string, unknown>>(
    `${BASE}/player/${encodeURIComponent(username)}`,
    OPTS
  );
  return result.ok;
}
