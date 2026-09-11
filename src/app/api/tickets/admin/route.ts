import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role, TicketStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole([Role.ADMIN]);

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") ?? undefined;
    const take = 20;

    const tickets = await prisma.ticket.findMany({
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where: { status: "PENDING" },
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

    return NextResponse.json({ tickets, nextCursor });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

