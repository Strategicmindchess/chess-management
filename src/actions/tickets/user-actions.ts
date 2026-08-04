"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { TicketCategory, Role } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function getUserTickets() {
  const user = await getCurrentUser();
  if (!user || user.role === Role.ADMIN) return { error: "Unauthorized" };
  
  // StudentProfile creates the ticket. So we need the student profile id if the user is a student.
  let creatorId = "";
  if (user.role === Role.STUDENT) {
    const student = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (!student) return { error: "Profile not found" };
    creatorId = student.id;
  } else {
    return { error: "Only students can raise tickets for now based on schema (createdBy StudentProfile)" };
  }

  const tickets = await prisma.ticket.findMany({
    where: { createdById: creatorId },
    orderBy: { createdAt: "desc" },
    include: {
      replies: {
        include: { author: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  return { tickets };
}

export async function createTicket(title: string, description: string, category: TicketCategory) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) return { error: "Unauthorized" };

  const student = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  if (!student) return { error: "Profile not found" };

  try {
    await prisma.ticket.create({
      data: {
        title,
        description,
        category,
        createdById: student.id,
      },
    });

    revalidatePath("/student/tickets");
    return { success: true };
  } catch (error) {
    console.error("Error creating ticket:", error);
    return { error: "Failed to create ticket" };
  }
}

export async function replyToOwnTicket(ticketId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  if (!content.trim()) return { error: "Reply cannot be empty" };

  try {
    await prisma.ticketReply.create({
      data: {
        ticketId,
        content,
        authorId: user.id, // TicketReply uses User as author
      },
    });

    revalidatePath("/student/tickets");
    return { success: true };
  } catch (error) {
    console.error("Error replying to ticket:", error);
    return { error: "Failed to send reply" };
  }
}
