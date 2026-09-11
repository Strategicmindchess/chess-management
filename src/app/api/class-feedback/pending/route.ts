import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

// ─── GET /api/class-feedback/pending ─────────────────────────────────────────
// Student gets their pending class feedbacks
export async function GET(req: NextRequest) {
  const user = await requireRole([Role.STUDENT]);

  try {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    // Find all COMPLETED class instances for batches this student is in
    // where they have NOT yet submitted feedback.
    const pendingClassLogs = await prisma.classLog.findMany({
      where: {
        // Ignore backlog before today (feature launch date)
        date: {
          gte: new Date("2026-08-31T00:00:00.000Z")
        },
        // The class instance must be completed
        classInstance: {
          status: "COMPLETED",
        },
        // The student must be in the batch
        batch: {
          students: {
            some: {
              studentProfileId: studentProfile.id,
            },
          },
        },
        // The student has NOT submitted feedback for this class log
        classFeedbacks: {
          none: {
            studentProfileId: studentProfile.id,
          },
        },
      },
      // Include enough info to display in the modal
      include: {
        classInstance: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          }
        },
        batch: {
          select: {
            name: true,
            type: true,
          }
        },
        coach: {
          include: {
            user: {
              select: {
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        date: "asc", // Oldest first
      }
    });

    return NextResponse.json({ pendingClassLogs });
  } catch (error: any) {
    if (error?.message === "Forbidden" || error?.digest === "NEXT_REDIRECT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[GET /api/class-feedback/pending]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

