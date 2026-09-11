import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

export const dynamic = "force-dynamic";

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Returns unread (and recent read) notifications for the authenticated user.
// Dashboard reload calls this — it NEVER creates notifications, only reads them.
export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireRole>>;
  try {
    user = await requireRole([Role.ADMIN, Role.TEACHER, Role.STUDENT]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const onlyUnread = searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: user.id,
      ...(onlyUnread ? { isRead: false } : {}),
    },
    orderBy: [
      { isRead: "asc" },
      { createdAt: "desc" },
    ],
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { recipientId: user.id, isRead: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

