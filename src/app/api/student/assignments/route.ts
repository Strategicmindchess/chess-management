import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { getStudentAssignments } from "@/actions/assignment-actions";
import { withLogging } from "@/lib/api-logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/student/assignments
 * Fetches ONLY the assignments for the currently logged-in student.
 */
export let GET = withLogging(async function (req: NextRequest) {
  await requireRole([Role.STUDENT]);

  try {
    const result = await getStudentAssignments();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch student assignments" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      assignments: result.data || [],
      progress: result.progress,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch student assignments" },
      { status: 500 }
    );
  }
});
