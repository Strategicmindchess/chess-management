import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { ROLE_HOME_PATH } from "@/lib/constants";
import { readAuthCookies, resolveSession } from "@/services/auth/session";

/**
 * Optimistic + authoritative session check. Reads the access/refresh cookies
 * and resolves the current identity. Redirects to /login when there is no
 * valid session. Memoized per request with React's `cache` so it is cheap to
 * call from multiple places.
 */
export const verifySession = cache(async () => {
  let session = null;
  try {
    const { accessToken, refreshToken } = await readAuthCookies();
    session = await resolveSession(accessToken, refreshToken);
  } catch (error) {
    console.error("Error verifying session:", error);
  }

  if (!session) {
    redirect("/login");
  }

  return session;
});

/**
 * Fetches the authenticated user's minimal profile from the database.
 * This is the "secure" check recommended by the Next.js auth guide: it
 * validates against the database, not just the cookie's contents.
 */
export const getCurrentUser = cache(async () => {
  const session = await verifySession();

  let user = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
  }

  if (!user || !user.isActive) {
    redirect("/api/auth/clear-session");
  }

  return user;
});

/**
 * Guards a Server Component/Server Action/Route Handler so that only the
 * given roles may proceed. Anyone else is redirected to their own dashboard.
 */
export async function requireRole<T extends Role>(allowedRoles: readonly T[]) {
  const user = await getCurrentUser();

  if (!allowedRoles.includes(user.role as T)) {
    redirect(ROLE_HOME_PATH[user.role]);
  }

  return user;
}
