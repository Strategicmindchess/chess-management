import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { withLogging } from "../../../../lib/api-logger";

// ─── GET /api/class-feedback/pending ─────────────────────────────────────────
// Fetches pending class feedback forms for the authenticated student.
//
// Key Optimizations & Business Rules:
// 1. Single Database Query for Student + Enrollments:
//    Fetches studentProfile and all batch memberships (with joinedAt) together,
//    eliminating an extra database roundtrip.
// 2. Strict 48-Hour Feedback Window:
//    Classes older than 48 hours are automatically expired and excluded.
// 3. New Student Protection (Batch joinedAt):
//    For each batch, only classes created AFTER the student was enrolled are considered.
//    Classes that took place before the student joined are discarded at the DB level.
// 4. Absentee Protection:
//    Students marked ABSENT, LEAVE, or HOLIDAY are excluded from feedback.
// 5. Query Limit & Index Friendly:
//    Uses `take: 2` and `orderBy: createdAt desc` to fetch only the newest relevant classes
//    without loading unnecessary backlog rows into server memory.
export let GET = withLogging(async function(req: NextRequest) {
  try {
    const user = await requireRole([Role.STUDENT]);

    // OPTIMIZATION 1: Fetch studentProfile together with their batch enrollments in 1 query.
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        enrollments: {
          select: {
            batchId: true,
            joinedAt: true,
          },
        },
      },
    });

    if (!studentProfile || studentProfile.enrollments.length === 0) {
      return NextResponse.json({ pendingClassLogs: [] });
    }

    // 48 hours ago cutoff timestamp
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // OPTIMIZATION 2: Build database-level filters per batch.
    // For each batch the student is in, only check classes created AFTER whichever is later:
    // - The time the student was added to that batch (e.joinedAt)
    // - 48 hours ago (fortyEightHoursAgo)
    // This pushes the date and joinedAt filtering directly down into the PostgreSQL engine.
    const batchConditions = studentProfile.enrollments.map((e) => ({
      batchId: e.batchId,
      createdAt: {
        gte: e.joinedAt > fortyEightHoursAgo ? e.joinedAt : fortyEightHoursAgo,
      },
    }));

    // OPTIMIZATION 3: Query ClassLogs with DB-level OR conditions, absence check, and take limit.
    const rawPendingClassLogs = await prisma.classLog.findMany({
      where: {
        OR: batchConditions,
        // Class instance must have completed
        classInstance: {
          status: "COMPLETED",
        },
        // Exclude classes where coach marked this student ABSENT, LEAVE, or HOLIDAY
        attendance: {
          none: {
            studentProfileId: studentProfile.id,
            status: {
              in: ["ABSENT", "LEAVE", "HOLIDAY"],
            },
          },
        },
        // Exclude classes where student already submitted feedback
        classFeedbacks: {
          none: {
            studentProfileId: studentProfile.id,
          },
        },
      },
      include: {
        classInstance: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
            completedAt: true,
          },
        },
        batch: {
          select: {
            name: true,
            type: true,
          },
        },
        coach: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc", // Newest classes first
      },
      take: 2, // Only fetch up to 2 newest items to save memory & payload size
    });

    // Safety check: ensure exact classInstance.completedAt is also within 48 hours
    const pendingClassLogs = rawPendingClassLogs.filter((log) => {
      const completionTime =
        log.classInstance?.completedAt ??
        log.attendanceMarkedAt ??
        log.createdAt;

      const ageMs = now.getTime() - new Date(completionTime).getTime();
      return ageMs <= 48 * 60 * 60 * 1000;
    });

    return NextResponse.json({ pendingClassLogs });
  } catch (error: any) {
    if (error?.message === "Forbidden" || error?.digest === "NEXT_REDIRECT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[GET /api/class-feedback/pending]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
