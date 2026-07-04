import "server-only";
import { cookies } from "next/headers";
import { Role } from "@/lib/enums";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/constants";
import { createAccessToken, verifyAccessToken } from "./access-token";
import {
  issueRefreshToken,
  revokeAllRefreshTokensForUser,
  revokeRefreshToken,
  verifyRefreshToken,
} from "./refresh-token";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "./cookie-options";

export interface ResolvedSession {
  userId: string;
  role: Role;
}

/**
 * Resolves the current identity from raw cookie values. Tries the
 * short-lived access token first (fast, no DB call); falls back to
 * validating the refresh token against the database. Pure function (no
 * cookie API calls) so it works from both `proxy.ts` (`NextRequest` cookies)
 * and the DAL (`next/headers` cookies).
 */
export async function resolveSession(
  accessToken: string | undefined,
  refreshToken: string | undefined,
): Promise<ResolvedSession | null> {
  const accessPayload = await verifyAccessToken(accessToken);
  if (accessPayload) {
    return { userId: accessPayload.userId, role: accessPayload.role };
  }

  return verifyRefreshToken(refreshToken);
}

/** Issues a fresh access + refresh token pair and stores both as cookies. Call only from a Server Action/Route Handler. */
export async function startSession(userId: string, role: Role): Promise<void> {
  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken(userId, role),
    issueRefreshToken(userId),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions());
  cookieStore.set(
    REFRESH_TOKEN_COOKIE,
    refreshToken,
    refreshTokenCookieOptions(),
  );
}

/** Ends the current session: revokes the refresh token and clears both cookies. */
export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  await revokeRefreshToken(refreshToken);

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function readAuthCookies(): Promise<{
  accessToken?: string;
  refreshToken?: string;
}> {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value,
  };
}

/**
 * Signs the user out everywhere (all devices/sessions), then immediately
 * starts a fresh session for the current device. Used after a password
 * change or reset so a leaked/old session elsewhere is invalidated while the
 * device that just changed the password stays signed in.
 */
export async function invalidateOtherSessionsAndRestart(
  userId: string,
  role: Role,
): Promise<void> {
  await revokeAllRefreshTokensForUser(userId);
  await startSession(userId, role);
}
