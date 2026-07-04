import 'server-only';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

const googleJwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getRedirectUri(): string {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return `${appUrl}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

/** Exchanges an OAuth `code` for tokens and verifies the returned ID token against Google's public keys. */
export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile | null> {
  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) return null;

  const tokenData = (await tokenResponse.json()) as { id_token?: string };
  if (!tokenData.id_token) return null;

  try {
    const { payload } = await jwtVerify(tokenData.id_token, googleJwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const email = payload.email as string | undefined;
    const googleId = payload.sub;

    if (!email || !googleId) return null;

    return {
      googleId,
      email: email.toLowerCase(),
      name: (payload.name as string | undefined) || email.split('@')[0],
    };
  } catch {
    return null;
  }
}
