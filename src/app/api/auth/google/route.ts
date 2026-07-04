import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from '@/services/auth/google-oauth';
import { OAUTH_STATE_COOKIE } from '@/lib/constants';

/** Redirects to Google's consent screen, storing an anti-CSRF `state` value in a short-lived cookie. */
export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'google_not_configured');
    return NextResponse.redirect(loginUrl);
  }

  const state = randomBytes(16).toString('hex');
  const response = NextResponse.redirect(buildGoogleAuthUrl(state));

  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return response;
}
