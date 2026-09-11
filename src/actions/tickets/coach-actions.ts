"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role, TicketCategory } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { notifyAllAdmins } from "@/lib/notifications";
import { NotificationType, NotifPriority } from "@/generated/prisma/client";

// ─── Get coach's own tickets ──────────────────────────────────────────────────
export async function getCoachTickets() {
  const user = await requireRole([Role.TEACHER]);

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
  });
  if (!coachProfile) return { error: "Coach profile not found" };

  const tickets = await prisma.ticket.findMany({
    where: { coachCreatedById: coachProfile.id },
    orderBy: { createdAt: "desc" },
    include: {
      replies: {
        include: { author: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return { tickets };
}

// ─── Coach create a ticket ─────────────────────────────────────────────────────
export async function createCoachTicket(
  title: string,
  description: string,
  category: TicketCategory
) {
  const user = await requireRole([Role.TEACHER]);

  if (!title.trim() || !description.trim()) {
    return { error: "Title and description are required" };
  }

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
  });
  if (!coachProfile) return { error: "Coach profile not found" };

  try {
    const ticket = await prisma.ticket.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category,
        coachCreatedById: coachProfile.id,
      },
    });

    // Notify all admins about the new coach ticket (idempotent)
    await notifyAllAdmins({
      type: NotificationType.TICKET_RAISED,
      title: "🎫 New Coach Support Ticket",
      message: `Coach ticket raised: "${title.trim()}" [${category}]`,
      baseEventKey: `TICKET_RAISED:${ticket.id}`,
      priority: NotifPriority.NORMAL,
      href: `/admin/tickets`,
    });

    revalidatePath("/teacher/tickets");
    return { success: true };
  } catch (err) {
    console.error("[createCoachTicket]", err);
    return { error: "Failed to create ticket" };
  }
}

// ─── Coach reply to own ticket ─────────────────────────────────────────────────
export async function replyToCoachTicket(ticketId: string, content: string) {
  const user = await requireRole([Role.TEACHER]);

  if (!content.trim()) return { error: "Reply cannot be empty" };

  // Verify ticket belongs to this coach
  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
  });
  if (!coachProfile) return { error: "Coach profile not found" };

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, coachCreatedById: coachProfile.id },
  });
  if (!ticket) return { error: "Ticket not found" };

  try {
    await prisma.ticketReply.create({
      data: { ticketId, content: content.trim(), authorId: user.id },
    });
    revalidatePath("/teacher/tickets");
    return { success: true };
  } catch (err) {
    console.error("[replyToCoachTicket]", err);
    return { error: "Failed to send reply" };
  }
}

