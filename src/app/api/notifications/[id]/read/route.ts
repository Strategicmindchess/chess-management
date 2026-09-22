import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { withLogging } from "../../../../../lib/api-logger";

// ─── POST /api/notifications/[id]/read ────────────────────────────────────────
// Mark a single notification as read.
export let POST = withLogging(async function(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let user: Awaited<ReturnType<typeof requireRole>>;
    try {
    user = await requireRole([Role.ADMIN, Role.TEACHER, Role.STUDENT]);
    } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const notification = await prisma.notification.findUnique({
    where: { id },
    });

    if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Ensure the user can only mark their own notifications as read
    if (notification.recipientId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
    });
