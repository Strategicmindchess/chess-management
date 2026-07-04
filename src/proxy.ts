import { NextResponse, type NextRequest } from "next/server";
import {
  createAccessToken,
  verifyAccessToken,
} from "@/services/auth/access-token";
import { verifyRefreshToken } from "@/services/auth/refresh-token";
import { accessTokenCookieOptions } from "@/services/auth/cookie-options";
import { Role } from "@/lib/enums";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ROLE_HOME_PATH,
} from "@/lib/constants";

const PUBLIC_ONLY_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

const ROLE_PREFIX: { prefix: string; role: Role }[] = [
  { prefix: "/admin", role: Role.ADMIN },
  { prefix: "/teacher", role: Role.TEACHER },
  { prefix: "/student", role: Role.STUDENT },
];

/**
 * Optimistic auth check that runs on (almost) every request. Verifies the
 * short-lived access token cookie without touching the database. If it has
 * expired, falls back to the (DB-backed) refresh token so the user is kept
 * silently signed in, and reissues a fresh access token on the response.
 * The authoritative checks still live in the Data Access Layer
 * (`src/lib/dal.ts`), which every protected Server Component/Action calls.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessCookie = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  let session = await verifyAccessToken(accessCookie);
  const response = NextResponse.next();

  if (!session && refreshCookie) {
    const refreshed = await verifyRefreshToken(refreshCookie);

    if (refreshed) {
      session = refreshed;
      const newAccessToken = await createAccessToken(
        refreshed.userId,
        refreshed.role,
      );
      response.cookies.set(
        ACCESS_TOKEN_COOKIE,
        newAccessToken,
        accessTokenCookieOptions(),
      );
    }
  }

  const matchedSection = ROLE_PREFIX.find(({ prefix }) =>
    pathname.startsWith(prefix),
  );

  if (matchedSection && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matchedSection && session && matchedSection.role !== session.role) {
    return NextResponse.redirect(
      new URL(ROLE_HOME_PATH[session.role], request.url),
    );
  }

  if (PUBLIC_ONLY_ROUTES.has(pathname) && session) {
    return NextResponse.redirect(
      new URL(ROLE_HOME_PATH[session.role], request.url),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)",
  ],
};
