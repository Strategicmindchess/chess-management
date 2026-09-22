import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withLogging } from "../../../../lib/api-logger";

export const dynamic = "force-dynamic";
export let GET = withLogging(async function() {
    try {
    const user = await prisma.user.findFirst({
      where: { name: { contains: 'Adhish', mode: 'insensitive' } },
      include: {
        studentProfile: {
          include: {
            chessAccount: true,
            leaderboardEntries: {
              orderBy: { periodStart: 'desc' },
              take: 2,
            }
          }
        }
      }
    });
    return NextResponse.json(user);
    } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
    }
    });
