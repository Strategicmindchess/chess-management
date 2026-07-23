import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { Role } from '@/lib/enums';
import { REFRESH_TOKEN_TTL_MS } from '@/lib/constants';

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/** Creates a new refresh token, stores its hash, and returns the raw value for the cookie. */
export async function issueRefreshToken(userId: string): Promise<string> {
  const rawToken = randomBytes(48).toString('hex');

  try {
    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return rawToken;
  } catch (error) {
    console.error("Failed to issue refresh token (DB error):", error);
    throw new Error("Could not issue refresh token due to database error");
  }
}

/**
 * Looks up a raw refresh token against the database. Returns the associated
 * user's id/role when it is valid (not expired, not revoked, account still
 * active), or `null` otherwise. Does not rotate the token — it stays valid
 * until it expires or is explicitly revoked (logout, password change/reset).
 */
export async function verifyRefreshToken(
  rawToken: string | undefined,
): Promise<{ userId: string; role: Role } | null> {
  if (!rawToken) return null;

  try {
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date() || !record.user.isActive) {
      return null;
    }

    return { userId: record.user.id, role: record.user.role };
  } catch (error) {
    // If the database is unreachable, do not crash the middleware.
    // Instead, treat the token as unverified.
    console.error("Failed to verify refresh token (DB error):", error);
    return null;
  }
}

export async function revokeRefreshToken(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;

  try {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to revoke refresh token (DB error):", error);
  }
}

/** Signs the user out of every device — used on password reset/change. */
export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  try {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to revoke all refresh tokens (DB error):", error);
  }
}
