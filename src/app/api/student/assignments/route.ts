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
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "PENDING") as "PENDING" | "HALF_DONE" | "FULLY_DONE" | "ALL";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const type = searchParams.get("type") || "ALL";
    const search = searchParams.get("search") || "";

    const result = await getStudentAssignments({
      status,
      page,
      limit,
      type,
      search,
    });

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
      pagination: result.pagination,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch student assignments" },
      { status: 500 }
    );
  }
});
