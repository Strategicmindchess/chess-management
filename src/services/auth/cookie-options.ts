import 'server-only';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_MS } from '@/lib/constants';

/** Shared cookie flags so the access/refresh cookies are configured identically whether they are set via `next/headers` (Server Actions) or directly on a `NextResponse` (proxy, Route Handlers). */
export function accessTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export function refreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
  };
}
