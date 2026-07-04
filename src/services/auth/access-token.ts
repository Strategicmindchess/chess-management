import 'server-only';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { Role } from '@/lib/enums';
import { ACCESS_TOKEN_TTL_SECONDS } from '@/lib/constants';

function getEncodedSecretKey() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 16) {
    throw new Error(
      'SESSION_SECRET environment variable is missing or too short. Set a long random value in your .env file.',
    );
  }

  return new TextEncoder().encode(secret);
}

export interface AccessTokenPayload extends JWTPayload {
  userId: string;
  role: Role;
}

/** Signs a short-lived JWT that Server Components/Actions trust without a DB call. */
export async function createAccessToken(userId: string, role: Role): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getEncodedSecretKey());
}

/** Verifies an access token. Returns `null` (never throws) if invalid/expired. */
export async function verifyAccessToken(
  token: string | undefined,
): Promise<AccessTokenPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify<AccessTokenPayload>(token, getEncodedSecretKey(), {
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    return null;
  }
}
