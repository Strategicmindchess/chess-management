import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/enums";
import { getAdminDashboardStats } from "@/actions/dashboard-actions";
import { getAssignmentReport } from "@/actions/assignment-actions";
import { withLogging } from "../../../../lib/api-logger";

export const dynamic = "force-dynamic";
export let GET = withLogging(async function(req: NextRequest) {
    await requireRole([Role.ADMIN]);

    try {
    const [stats, reportDataResponse] = await Promise.all([
      getAdminDashboardStats(),
      getAssignmentReport(),
    ]);

    const reportData = reportDataResponse as any;
    const summary = reportData.success && reportData.summary
      ? reportData.summary
      : { totalStudents: 0, completedAll: 0, missing: 0 };

    return NextResponse.json({
      stats,
      summary
    });
    } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch admin dashboard stats" },
      { status: 500 }
    );
    }
    });
