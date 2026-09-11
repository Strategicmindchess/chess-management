import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireRole([Role.ADMIN]);
  
  try {
    const [coachesData, studentsData] = await Promise.all([
      prisma.coachProfile.findMany({
        where: { user: { isActive: true, emailVerified: true } },
        select: {
          id: true,
          user: { select: { name: true, email: true } },
          availabilities: { select: { date: true, startTime: true, endTime: true } }
        },
        orderBy: { user: { name: "asc" } },
      }),
      prisma.studentProfile.findMany({
        where: { user: { isActive: true, emailVerified: true } },
        select: {
          id: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { user: { name: "asc" } },
      })
    ]);

    const coaches = coachesData.map(c => ({
      id: c.id,
      name: c.user.name,
      email: c.user.email,
      availabilities: c.availabilities.map(a => ({
        date: a.date.toISOString(),
        startTime: a.startTime,
        endTime: a.endTime,
      })),
    }));

    const students = studentsData.map((s) => ({
      id: s.id,
      name: s.user.name,
      email: s.user.email,
    }));

    return NextResponse.json(
      { coaches, students },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch batch options" },
      { status: 500 }
    );
  }
}
