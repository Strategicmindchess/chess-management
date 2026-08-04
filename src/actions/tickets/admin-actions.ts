"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role, TicketStatus } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function getAdminTickets(cursor?: string) {
  await requireRole([Role.ADMIN]);

  const take = 10;
  const tickets = await prisma.ticket.findMany({
    take,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    where: {
      status: "PENDING",
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      createdBy: {
        include: {
          user: true,
        },
      },
      replies: {
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "asc",
        }
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

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error resolving ticket:", error);
    return { error: "Failed to resolve ticket." };
  }
}
