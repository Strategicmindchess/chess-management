import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { withLogging } from "../../../../lib/api-logger";

// ─── POST /api/notifications/read-all ─────────────────────────────────────────
// Mark ALL notifications as read for the authenticated user.
export let POST = withLogging(async function(req: NextRequest) {
    let user: Awaited<ReturnType<typeof requireRole>>;
    try {
    user = await requireRole([Role.ADMIN, Role.TEACHER, Role.STUDENT]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await prisma.notification.updateMany({
    where: { recipientId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true, markedRead: result.count });
    });
