import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@/lib/enums';
import {
  ACCESS_TOKEN_COOKIE,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ROLE_HOME_PATH,
} from '@/lib/constants';
import { exchangeCodeForProfile } from '@/services/auth/google-oauth';
import { createAccessToken } from '@/services/auth/access-token';
import { issueRefreshToken } from '@/services/auth/refresh-token';
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '@/services/auth/cookie-options';

/**
 * Finishes the Google sign-in/sign-up flow: verifies the `state` value,
 * exchanges the auth `code` for a verified profile, then finds or creates a
 * matching user (new accounts are always Students — Coach/Admin accounts are
 * Admin-provisioned) before starting a normal session.
 */
export async function GET(request: NextRequest) {
  const failureUrl = new URL('/login', request.url);
  failureUrl.searchParams.set('error', 'google_failed');

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(failureUrl);
  }

  const profile = await exchangeCodeForProfile(code);
  if (!profile) {
    return NextResponse.redirect(failureUrl);
  }

  let user = await prisma.user.findUnique({ where: { email: profile.email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        role: Role.STUDENT,
        googleId: profile.googleId,
        emailVerified: true,
      },
    });
  } else if (!user.isActive) {
    const inactiveUrl = new URL('/login', request.url);
    inactiveUrl.searchParams.set('error', 'account_inactive');
    return NextResponse.redirect(inactiveUrl);
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: profile.googleId, emailVerified: true },
    });
  }

  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken(user.id, user.role),
    issueRefreshToken(user.id),
  ]);

  const response = NextResponse.redirect(new URL(ROLE_HOME_PATH[user.role], request.url));
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions());
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions());
  response.cookies.delete(OAUTH_STATE_COOKIE);

  return response;
}
