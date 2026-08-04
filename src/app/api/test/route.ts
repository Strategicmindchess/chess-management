import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  
  if (!userId) return NextResponse.json({ error: "No userId provided" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            enrollments: {
              include: { batch: { include: { coach: { include: { user: true } } } } }
            },
            attendanceRecords: {
              include: { classLog: { include: { batch: true } } },
              orderBy: { classLog: { date: "desc" } },
            }
          }
        },
        coachProfile: {
          include: {
            batches: true,
            classLogs: {
              orderBy: { date: "desc" }
            }
          }
        }
      }
    });

    return NextResponse.json({ found: !!user, user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
