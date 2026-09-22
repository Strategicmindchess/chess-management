import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { withLogging } from "../../../../lib/api-logger";

// ─── DELETE /api/notifications/clear ──────────────────────────────────────────
// Deletes all notifications for the authenticated user
export let DELETE = withLogging(async function(req: NextRequest) {
    let user: Awaited<ReturnType<typeof requireRole>>;
    try {
    user = await requireRole([Role.ADMIN, Role.TEACHER, Role.STUDENT]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
    await prisma.notification.deleteMany({
      where: { recipientId: user.id },
    });
    return NextResponse.json({ success: true });
    } catch (error) {
    console.error("[DELETE /api/notifications/clear]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    });
