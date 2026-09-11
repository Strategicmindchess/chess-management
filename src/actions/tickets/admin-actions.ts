"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role, TicketStatus, NotificationType, NotifPriority } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";

export async function getAdminTickets(cursor?: string, creatorType: "student" | "coach" | "all" = "all") {
  await requireRole([Role.ADMIN]);

  const take = 20;

  const whereClause =
    creatorType === "student"
      ? { status: "PENDING" as const, coachCreatedById: null }
      : creatorType === "coach"
      ? { status: "PENDING" as const, coachCreatedById: { not: null } }
      : { status: "PENDING" as const };

  const tickets = await prisma.ticket.findMany({
    take,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    where: whereClause,
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: { include: { user: { select: { name: true, email: true } } } },
      coachCreatedBy: { include: { user: { select: { name: true, email: true } } } },
      replies: {
        include: { author: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const nextCursor = tickets.length === take ? tickets[take - 1].id : null;
  return { tickets, nextCursor };
}


export async function replyToTicket(ticketId: string, content: string) {
  const admin = await requireRole([Role.ADMIN]);
  
  if (!content.trim()) return { error: "Reply cannot be empty" };

  try {
    await prisma.ticketReply.create({
      data: {
        ticketId,
        content,
        authorId: admin.id,
      },
    });

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { createdBy: true, coachCreatedBy: true },
    });

    if (ticket) {
      const recipientUserId = ticket.createdBy?.userId || ticket.coachCreatedBy?.userId;
      if (recipientUserId) {
        await createNotification({
          recipientId: recipientUserId,
          type: NotificationType.TICKET_UPDATED,
          title: "🎫 Ticket Reply",
          message: `Admin replied to your ticket: "${ticket.title}"`,
          eventKey: `TICKET_REPLY:${ticketId}:${Date.now()}`, // unique per reply
          priority: NotifPriority.NORMAL,
          href: ticket.createdBy ? `/student/tickets` : `/teacher/tickets`,
        });
      }
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error replying to ticket:", error);
    return { error: "Failed to send reply." };
  }
}

export async function resolveTicket(ticketId: string) {
  await requireRole([Role.ADMIN]);

  try {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "RESOLVED" },
    });

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { createdBy: true, coachCreatedBy: true },
    });

    if (ticket) {
      const recipientUserId = ticket.createdBy?.userId || ticket.coachCreatedBy?.userId;
      if (recipientUserId) {
        await createNotification({
          recipientId: recipientUserId,
          type: NotificationType.TICKET_UPDATED,
          title: "✅ Ticket Resolved",
          message: `Your ticket has been marked as resolved: "${ticket.title}"`,
          eventKey: `TICKET_RESOLVED:${ticketId}`,
          priority: NotifPriority.NORMAL,
          href: ticket.createdBy ? `/student/tickets` : `/teacher/tickets`,
        });
      }
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error resolving ticket:", error);
    return { error: "Failed to resolve ticket." };
  }
}

